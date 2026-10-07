import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";
import {
  acceptMission,
  authorizeReward,
  createCampaign,
  createMission,
  recordVerification,
  redeemReward,
  submitEvidence,
} from "@/lib/fan-economy/service";
import { canonicalCommitments } from "@/lib/fan-economy/materialization/service";
import {
  CERTIFIED_HACKATHON_REDEMPTION_ID,
  readCertifiedHackathonProof,
  type PublicChainSnapshot,
  type PublicProofReadOptions,
} from "@/lib/fan-economy/public-proof/certifiedHackathonProof";
import { publicLiveRead } from "@/lib/fan-economy/public-proof/liveProbe";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";

const ARTIST = "moc:actor:8114ea00-00bf-40e1-9e89-735be899902b";
const FAN = "moc:actor:1558188b-b219-4f01-9e9d-5a0884b45b69";
const PRIVATE_NAME = "Nombre privado del artista";
const PRIVATE_EMAIL = "privado@example.invalid";
const USDC = { asset: "USDC", scale: 6 };
const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const TX = "fcb8bb94eec5be7e853c2db3d59a83dbca6a5c7e3c22079e2f33dba6fc3c2119";
const MATERIALIZATION = "a5c9d5a53c8f5e804d3a2e310438073e23a337ab77d557b498799b30506d50d9";
const REVENUE_ID = "revenue:redemption:redeem-b3e4df75-2f1";

describe("public certified hackathon proof", { timeout: 40_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("reads the certified record without writes, selectors, or a live signature", async () => {
    const seeded = await seedCertified();
    const before = await census(seeded.prisma);
    const calls: string[] = [];
    const proof = await readCertifiedHackathonProof(seeded.prisma, {
      liveRead: async (redemptionId) => {
        calls.push(redemptionId);
        return locked(seeded.materialization);
      },
      redemptionId: "redeem-decoy-not-public",
      actorRef: "moc:actor:forged",
      wallet: "GDECOY",
      contract: "C".padEnd(56, "A"),
      network: "public",
      tx: "ab".repeat(32),
      verified: true,
    } as PublicProofReadOptions);
    const after = await census(seeded.prisma);

    expect(before).toEqual(after);
    expect(before.bindings).toBe(0);
    expect(before.wallets).toBe(0);
    expect(before.observations).toBe(0);
    expect(calls).toEqual([CERTIFIED_HACKATHON_REDEMPTION_ID]);
    expect(proof.available).toBe(true);
    if (!proof.available) return;
    expect(proof.redemptionId).toBe(CERTIFIED_HACKATHON_REDEMPTION_ID);
    expect(proof.revenueId).toBe(REVENUE_ID);
    expect(proof.releaseTitle).toBe("MOC Preprod Test");
    expect(proof.support).toMatchObject({ units: "1000000", scale: 6, asset: "USDC", label: "$1.00 USDC" });
    expect(proof.gross.label).toBe("$1.00 USDC");
    expect(proof.artistParticipation.label).toBe("$1.00 USDC");
    expect(proof.economicStatus).toBe("accrued");
    expect(proof.economicRecord).toBe(true);
    expect(proof.persistedVerification).toBe("verified");
    expect(proof.protocolState).toBe("locked");
    expect(proof.network).toBe("testnet");
    expect(proof.contractId).toBe(CONTRACT);
    expect(proof.transactionHash).toBe(TX);
    expect(proof.ledger).toBe(5041383);
    expect(proof.commitments?.materialization).toBe(MATERIALIZATION);
    expect(proof.transactionUrl).toBe(`https://stellar.expert/explorer/testnet/tx/${TX}`);
    expect(proof.contractUrl).toBe(`https://stellar.expert/explorer/testnet/contract/${CONTRACT}`);
    expect(proof.liveNetworkStatus).toBe("confirmed");
    const shared = {
      transaction: proof.transactionHash,
      contract: proof.contractId,
      ledger: proof.ledger,
      materialization: proof.commitments?.materialization,
    };
    expect({ fan: shared, artist: shared }.fan).toEqual({ fan: shared, artist: shared }.artist);
    const serialized = JSON.stringify(proof);
    expect(serialized).not.toContain(ARTIST);
    expect(serialized).not.toContain(FAN);
    expect(serialized).not.toContain(PRIVATE_NAME);
    expect(serialized).not.toContain(PRIVATE_EMAIL);
    expect(serialized).not.toContain("privy");
  });

  it("keeps persisted verification when the live read fails or times out", async () => {
    const seeded = await seedCertified();
    const missing = await readCertifiedHackathonProof(seeded.prisma, {
      liveRead: async () => {
        throw new Error("RPC_FAILURE");
      },
    });
    let settleSlow: (snapshot: PublicChainSnapshot) => void = () => undefined;
    const slowGate = new Promise<PublicChainSnapshot>((resolve) => {
      settleSlow = resolve;
    });
    const slow = await readCertifiedHackathonProof(seeded.prisma, {
      liveTimeoutMs: 20,
      liveRead: () => slowGate,
    });
    settleSlow(locked(seeded.materialization));
    const down = await readCertifiedHackathonProof(seeded.prisma);
    for (const proof of [missing, slow, down]) {
      expect(proof.available).toBe(true);
      if (!proof.available) continue;
      expect(proof.persistedVerification).toBe("verified");
      expect(proof.protocolState).toBe("locked");
      expect(proof.economicRecord).toBe(true);
      expect(proof.transactionHash).toBe(TX);
      expect(proof.ledger).toBe(5041383);
      expect(proof.transactionUrl).toContain("/tx/");
      expect(proof.contractUrl).toContain("/contract/");
      expect(proof.liveNetworkStatus).toBe("unavailable");
    }
  });

  it("does not let a live lock or a browser flag invent verification", async () => {
    const seeded = await seedCertified();
    await seeded.prisma.economicChainEvidence.updateMany({
      where: { redemptionId: CERTIFIED_HACKATHON_REDEMPTION_ID },
      data: { state: "pending", transactionHash: null, ledger: null },
    });
    const proof = await readCertifiedHackathonProof(seeded.prisma, {
      liveRead: async () => locked(MATERIALIZATION),
      verified: true,
      network: "testnet",
    } as PublicProofReadOptions);
    expect(proof.available).toBe(true);
    if (!proof.available) return;
    expect(proof.persistedVerification).toBe("recorded");
    expect(proof.protocolState).toBe("not-locked");
    expect(proof.liveNetworkStatus).toBe("unavailable");
    expect(proof.transactionUrl).toBeNull();
  });

  it("returns an empty receipt when the certified redemption is absent", async () => {
    const opened = await openIsolatedPrisma();
    client = opened.client;
    file = opened.file;
    const before = await census(opened.client);
    const proof = await readCertifiedHackathonProof(opened.client, {
      liveRead: async () => locked(MATERIALIZATION),
    });
    expect(proof).toEqual({ available: false, liveNetworkStatus: "unavailable" });
    expect(await census(opened.client)).toEqual(before);
  });

  it("does not expose a signing client or an authority selector", () => {
    const reader = readFileSync("lib/fan-economy/public-proof/certifiedHackathonProof.ts", "utf8");
    const probe = readFileSync("lib/fan-economy/public-proof/liveProbe.ts", "utf8");
    const page = readFileSync("app/demo/stellar-proof/page.tsx", "utf8");
    const view = readFileSync("components/public-proof/PublicCertifiedProofView.tsx", "utf8");
    const card = readFileSync("components/fan-economy/StellarProofCard.tsx", "utf8");
    const surface = [reader, probe, page, view].join("\n");
    expect(surface).not.toMatch(/MOC_MATERIALIZER_SECRET|PRIVY_APP_SECRET|BASE_EXECUTOR_PRIVATE_KEY|fromSecret|x-actor-ref|searchParams/);
    expect(surface).not.toMatch(/lockRedemption|lock_redemption|authorize_reward|commit_reserve|reverse_redemption|sendTransaction/);
    expect(surface).not.toMatch(/provisionThenBind|requireActorSession|identityBinding\.create|actor\.create/);
    expect(probe).toContain("getRedemption");
    expect(probe).toContain("fromPublicKey");
    expect(page).not.toContain("useAuth");
    expect(card).toContain("credentials: \"include\"");
    expect(view).not.toContain("fetch(");
    expect(publicLiveRead({})).toBeUndefined();
    expect(publicLiveRead({ STELLAR_NETWORK: "public" })).toBeUndefined();
  });

  async function seedCertified() {
    const opened = await openIsolatedPrisma();
    client = opened.client;
    file = opened.file;
    const prisma = opened.client;
    await prisma.actor.upsert({ where: { actorRef: ARTIST }, update: {}, create: { actorRef: ARTIST } });
    await prisma.actor.upsert({ where: { actorRef: FAN }, update: {}, create: { actorRef: FAN } });
    const work = await prisma.musicalWork.create({ data: { actorRef: ARTIST, title: "Obra" } });
    const release = await prisma.musicRelease.create({
      data: {
        workId: work.id,
        actorRef: ARTIST,
        title: "MOC Preprod Test",
        releaseType: "single",
        language: "es",
        primaryGenre: "pop",
      },
    });
    await prisma.participation.create({
      data: {
        releaseId: release.id,
        displayName: PRIVATE_NAME,
        email: PRIVATE_EMAIL,
        actorRef: ARTIST,
        role: "performer",
        revenueSharePercent: 100,
      },
    });
    const campaign = await createCampaign(
      { artistActorRef: ARTIST, title: "Campaña", committed: { units: 10_000_000n, ...USDC } },
      prisma
    );
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: campaign.id,
        title: "Misión",
        criterion: "Escuchar",
        maximumReward: { units: 5_000_000n, ...USDC },
        assignmentMode: "fan-accept",
      },
      prisma
    );
    const assignment = await acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma);
    const missionEvidence = await submitEvidence(
      { fanActorRef: FAN, assignmentId: assignment.id, statement: "listo" },
      prisma
    );
    await recordVerification(
      { verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: missionEvidence.id, outcome: "accepted" },
      prisma
    );
    const reward = await authorizeReward(
      { artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: 5_000_000n, ...USDC } },
      prisma
    );
    const redeemed = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        redemptionId: CERTIFIED_HACKATHON_REDEMPTION_ID,
        releaseId: release.id,
      },
      prisma
    );
    await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        redemptionId: "redeem-decoy-not-public",
        releaseId: release.id,
      },
      prisma
    );
    const assessed = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId);
    if (!assessed) throw new Error("REVENUE_MISSING");
    const commitments = canonicalCommitments({
      redemptionId: redeemed.redemptionId,
      revenueId: redeemed.revenueId,
      shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
    });
    expect(commitments.materializationHash).toBe(MATERIALIZATION);
    await prisma.economicChainEvidence.create({
      data: {
        id: `evidence:testnet:${CONTRACT}:${redeemed.redemptionId}`,
        redemptionId: redeemed.redemptionId,
        revenueId: redeemed.revenueId,
        network: "testnet",
        contractId: CONTRACT,
        transactionHash: TX,
        ledger: 5041383,
        materializationHash: commitments.materializationHash,
        state: "confirmed",
      },
    });
    await prisma.economicChainEvidence.create({
      data: {
        id: `evidence:testnet:${CONTRACT}:redeem-decoy-not-public`,
        redemptionId: "redeem-decoy-not-public",
        revenueId: "revenue:redemption:redeem-decoy-not-public",
        network: "testnet",
        contractId: CONTRACT,
        transactionHash: "aa".repeat(32),
        ledger: 1,
        materializationHash: "bb".repeat(32),
        state: "confirmed",
      },
    });
    return { prisma, materialization: commitments.materializationHash };
  }
});

function locked(materializationHash: string): PublicChainSnapshot {
  return { status: "locked", materializationHash, contractId: CONTRACT };
}

async function census(prisma: PrismaClient) {
  const [actors, bindings, wallets, redemptions, revenues, entitlements, evidence, observations, rewards] = await Promise.all([
    prisma.actor.count(),
    prisma.identityBinding.count(),
    prisma.actorWallet.count(),
    prisma.redemption.count(),
    prisma.economicRevenue.count(),
    prisma.economicEntitlement.count(),
    prisma.economicChainEvidence.count(),
    prisma.chainEventObservation.count(),
    prisma.rewardEntitlement.count(),
  ]);
  return { actors, bindings, wallets, redemptions, revenues, entitlements, evidence, observations, rewards };
}
