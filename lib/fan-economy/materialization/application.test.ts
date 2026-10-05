import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { Keypair } from "@stellar/stellar-sdk";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import {
  acceptMission,
  authorizeReward,
  createCampaign,
  createMission,
  recordVerification,
  redeemReward,
  submitEvidence,
} from "@/lib/fan-economy/service";
import { acceptedMaterializationBody } from "@/lib/fan-economy/materialization/access";
import type { ChainSnapshot } from "@/lib/fan-economy/materialization/decision";
import { decideReserve, decideReward } from "@/lib/fan-economy/materialization/ensure";
import {
  materializeRedemption,
  reconcileMaterialization,
  type ChainReceipt,
  type MaterializationChain,
} from "@/lib/fan-economy/materialization/service";
import { actorHash, assetHash, campaignHash, hex32, releaseHash } from "@/lib/fan-economy/trust/canonical";
import { keypairFromSecret } from "@/lib/fan-economy/trust/sorobanClient";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";

const ARTIST = "moc:actor:11111111-1111-4111-8111-111111111111";
const FAN = "moc:actor:22222222-2222-4222-8222-222222222222";
const USDC = { asset: "USDC", scale: 6 };
const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const HASH = "11".repeat(32);

describe("application-native materialization", { timeout: 40_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("keeps reserve and reward ensure idempotent and refuses an incompatible chain payload", () => {
    const authority = hex32(actorHash(ARTIST));
    const asset = hex32(assetHash("USDC"));
    expect(decideReserve({ chain: null, authorityActor: authority, assetHash: asset, scale: "6", committedUnits: "5000000", authorityAvailable: true })).toBe("create");
    expect(decideReserve({ chain: null, authorityActor: authority, assetHash: asset, scale: "6", committedUnits: "5000000", authorityAvailable: false })).toBe("not-ready");
    expect(decideReserve({
      chain: { authorityActor: authority, assetHash: asset, scale: "6", committed: "5000000" },
      authorityActor: authority,
      assetHash: asset,
      scale: "6",
      committedUnits: "5000000",
      authorityAvailable: true,
    })).toBe("ready");
    expect(decideReserve({
      chain: { authorityActor: authority, assetHash: asset, scale: "6", committed: "1" },
      authorityActor: authority,
      assetHash: asset,
      scale: "6",
      committedUnits: "5000000",
      authorityAvailable: true,
    })).toBe("conflict");
    const fan = hex32(actorHash(FAN));
    const campaign = hex32(campaignHash("campaign:1"));
    expect(decideReward({ chain: null, campaignId: campaign, actorHash: fan, authorized: "5000000", authorityAvailable: false })).toBe("not-ready");
    expect(decideReward({
      chain: { campaignId: campaign, actorHash: fan, authorized: "5000000" },
      campaignId: campaign,
      actorHash: fan,
      authorized: "1",
      authorityAvailable: true,
    })).toBe("conflict");
  });

  it("ignores browser hashes and rejects a materializer key that does not match", () => {
    expect(acceptedMaterializationBody({
      redemptionId: "redemption:hackathon-2026-10-04",
      materializationHash: HASH,
      revenueId: "revenue:forged",
      distributionHash: HASH,
      contractId: "C".padEnd(56, "A"),
      network: "public",
      amount: "1",
    })).toEqual({ redemptionId: "redemption:hackathon-2026-10-04" });
    const route = readFileSync("app/api/fan-economy/route.ts", "utf8");
    expect(route).not.toMatch(/body\.(materializationHash|revenueId|distributionHash|contractId|network)/);
    const materializer = Keypair.random();
    const secret = materializer.secret();
    expect(() => keypairFromSecret(secret, Keypair.random().publicKey())).toThrow(FanEconomyError);
    try {
      keypairFromSecret(secret, Keypair.random().publicKey());
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
    const ui = [
      readFileSync("components/fan-economy/StellarEvidence.tsx", "utf8"),
      readFileSync("components/fan-economy/StellarProofCard.tsx", "utf8"),
    ].join("\n");
    expect(ui).not.toContain("SECRET");
    expect(ui).not.toContain("@stellar/stellar-sdk");
  });

  async function recorded(redemptionId: string) {
    const opened = await openIsolatedPrisma();
    client = opened.client;
    file = opened.file;
    const prisma = opened.client;
    await prisma.actor.upsert({ where: { actorRef: ARTIST }, update: {}, create: { actorRef: ARTIST } });
    const work = await prisma.musicalWork.create({ data: { actorRef: ARTIST, title: "Obra" } });
    const release = await prisma.musicRelease.create({
      data: { workId: work.id, actorRef: ARTIST, title: "Lanzamiento", releaseType: "single", language: "es", primaryGenre: "pop" },
    });
    await prisma.participation.create({
      data: { releaseId: release.id, displayName: "Artista", actorRef: ARTIST, role: "performer", revenueSharePercent: 100 },
    });
    const campaign = await createCampaign({ artistActorRef: ARTIST, title: "Campaña", committed: { units: 10_000_000n, ...USDC } }, prisma);
    const mission = await createMission({
      artistActorRef: ARTIST,
      campaignId: campaign.id,
      title: "Misión",
      criterion: "Escuchar",
      maximumReward: { units: 5_000_000n, ...USDC },
      assignmentMode: "fan-accept",
    }, prisma);
    const assignment = await acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma);
    const evidence = await submitEvidence({ fanActorRef: FAN, assignmentId: assignment.id, statement: "listo" }, prisma);
    await recordVerification({ verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: evidence.id, outcome: "accepted" }, prisma);
    const reward = await authorizeReward({ artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: 5_000_000n, ...USDC } }, prisma);
    const redeemed = await redeemReward({
      fanActorRef: FAN,
      rewardEntitlementId: reward.id,
      amount: { units: 1_000_000n, ...USDC },
      redemptionId,
      releaseId: release.id,
    }, prisma);
    const assessed = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId);
    if (!assessed) throw new Error("REVENUE_MISSING");
    return { prisma, redeemed, releaseId: release.id, campaignId: campaign.id, assignmentId: assignment.id, rewardId: reward.id, assessed };
  }

  function protocol(input: {
    campaignId: string;
    releaseId: string;
    distributionHash: string;
    materializationHash: string;
  }) {
    const calls = { reserve: 0, reward: 0, redeem: 0, lock: 0 };
    let reserve: { authorityActor: string; assetHash: string; scale: string; committed: string } | null = null;
    let grant: { campaignId: string; actorHash: string; authorized: string } | null = null;
    let current: ChainSnapshot | null = null;
    let failGet = false;
    const target = hex32(releaseHash(input.releaseId));
    const chain: MaterializationChain = {
      async readCampaign() {
        if (failGet) throw new Error("RPC_FAILURE");
        return reserve;
      },
      async commitReserve() {
        calls.reserve += 1;
        reserve = { authorityActor: hex32(actorHash(ARTIST)), assetHash: hex32(assetHash("USDC")), scale: "6", committed: "10000000" };
        return { transactionHash: "a1".repeat(32), ledger: 10 };
      },
      async readReward() {
        if (failGet) throw new Error("RPC_FAILURE");
        return grant;
      },
      async authorizeReward() {
        calls.reward += 1;
        grant = { campaignId: hex32(campaignHash(input.campaignId)), actorHash: hex32(actorHash(FAN)), authorized: "5000000" };
        return { transactionHash: "a2".repeat(32), ledger: 11 };
      },
      async getRedemption() {
        if (failGet) throw new Error("RPC_FAILURE");
        return current;
      },
      async redeemControlled() {
        calls.redeem += 1;
        current = { status: "committed", grantId: HASH, amount: "1000000", targetHash: target, distributionHash: input.distributionHash, materializationHash: null };
        const receipt: ChainReceipt = { transactionHash: "cd".repeat(32), ledger: 9, redemption: current };
        return receipt;
      },
      async lockRedemption(lockInput) {
        calls.lock += 1;
        await new Promise((resolve) => setTimeout(resolve, 30));
        current = {
          status: "locked",
          grantId: HASH,
          amount: "1000000",
          targetHash: target,
          distributionHash: lockInput.distributionHash,
          materializationHash: input.materializationHash,
        };
        return { transactionHash: "ab".repeat(32), ledger: 12, redemption: current };
      },
      async recover() {
        return "pending";
      },
    };
    return {
      chain,
      calls,
      target,
      fail(next: boolean) {
        failGet = next;
      },
      seedCommitted() {
        reserve = { authorityActor: hex32(actorHash(ARTIST)), assetHash: hex32(assetHash("USDC")), scale: "6", committed: "10000000" };
        grant = { campaignId: hex32(campaignHash(input.campaignId)), actorHash: hex32(actorHash(FAN)), authorized: "5000000" };
        current = { status: "committed", grantId: HASH, amount: "1000000", targetHash: target, distributionHash: input.distributionHash, materializationHash: null };
      },
      seedLocked() {
        this.seedCommitted();
        current = { status: "locked", grantId: HASH, amount: "1000000", targetHash: target, distributionHash: input.distributionHash, materializationHash: input.materializationHash };
      },
      setRedemption(next: ChainSnapshot | null) {
        current = next;
      },
    };
  }

  function deps(prisma: PrismaClient, chain: MaterializationChain, authorityActorRef: string | null = ARTIST, controlledActorRef: string | null = FAN) {
    return { client: prisma, chain, network: "testnet" as const, contractId: CONTRACT, controlledActorRef, authorityActorRef };
  }

  it("materializes once from canonical records and does not repeat chain writes", async () => {
    const { prisma, redeemed, releaseId, campaignId, assessed } = await recorded("redeem-app-001");
    const shares = assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps }));
    const { canonicalCommitments } = await import("@/lib/fan-economy/materialization/service");
    const commitments = canonicalCommitments({ redemptionId: redeemed.redemptionId, revenueId: redeemed.revenueId, shares });
    const fake = protocol({ campaignId, releaseId, distributionHash: commitments.distributionHash, materializationHash: commitments.materializationHash });
    const proof = await materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(fake.calls).toMatchObject({ reserve: 1, reward: 1, redeem: 1, lock: 1 });
    expect(proof.verification).toBe("verified");
    const again = await reconcileMaterialization({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(again.decision).toBe("CONFIRMED");
    expect(fake.calls.lock).toBe(1);
    expect(fake.calls.reserve).toBe(1);
    expect(await prisma.economicRevenue.count()).toBe(1);
    expect(await prisma.redemption.count()).toBe(1);
    const revenue = await prisma.economicRevenue.findUnique({ where: { id: redeemed.revenueId } });
    expect(revenue?.grossUnits).toBe("1000000");
    expect(revenue?.status).toBe("recorded");
  });

  it("keeps the economic record when Stellar is unavailable and retries safely", async () => {
    const { prisma, redeemed, releaseId, campaignId, assessed } = await recorded("redeem-app-002");
    const { canonicalCommitments } = await import("@/lib/fan-economy/materialization/service");
    const commitments = canonicalCommitments({
      redemptionId: redeemed.redemptionId,
      revenueId: redeemed.revenueId,
      shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
    });
    const fake = protocol({ campaignId, releaseId, distributionHash: commitments.distributionHash, materializationHash: commitments.materializationHash });
    fake.fail(true);
    const failed = await reconcileMaterialization({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(failed.decision).toBe("RETRY_SAFE");
    expect(failed.proof.lastError).toBe("RPC_FAILURE");
    expect((await prisma.redemption.findUnique({ where: { id: redeemed.redemptionId } }))?.state).toBe("recorded");
    expect(fake.calls.lock).toBe(0);
    fake.fail(false);
    const retried = await reconcileMaterialization({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(retried.decision).toBe("CONFIRMED");
    expect(fake.calls.lock).toBe(1);
  });

  it("stops on payload conflicts and missing canonical rows without a lock", async () => {
    const { prisma, redeemed, releaseId, campaignId, assessed } = await recorded("redeem-app-003");
    const { canonicalCommitments } = await import("@/lib/fan-economy/materialization/service");
    const commitments = canonicalCommitments({
      redemptionId: redeemed.redemptionId,
      revenueId: redeemed.revenueId,
      shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
    });
    const fake = protocol({ campaignId, releaseId, distributionHash: commitments.distributionHash, materializationHash: commitments.materializationHash });
    fake.seedCommitted();
    fake.setRedemption({
      status: "committed",
      grantId: HASH,
      amount: "1000000",
      targetHash: fake.target,
      distributionHash: "ab".repeat(32),
      materializationHash: null,
    });
    const distribution = await materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(distribution.lastError).toBe("PAYLOAD_CONFLICT");
    expect(fake.calls.lock).toBe(0);
    await prisma.economicChainEvidence.deleteMany();
    fake.setRedemption({
      status: "committed",
      grantId: HASH,
      amount: "2",
      targetHash: fake.target,
      distributionHash: commitments.distributionHash,
      materializationHash: null,
    });
    const amount = await materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(amount.lastError).toBe("PAYLOAD_CONFLICT");
    await prisma.economicChainEvidence.deleteMany();
    fake.setRedemption({
      status: "committed",
      grantId: HASH,
      amount: "1000000",
      targetHash: HASH,
      distributionHash: commitments.distributionHash,
      materializationHash: null,
    });
    const target = await materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(target.lastError).toBe("PAYLOAD_CONFLICT");
    expect(fake.calls.lock).toBe(0);
    await prisma.economicChainEvidence.deleteMany();
    fake.seedLocked();
    const same = await reconcileMaterialization({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(same.decision).toBe("INCONSISTENT");
    expect(fake.calls.lock).toBe(0);
    await prisma.economicChainEvidence.deleteMany();
    fake.setRedemption({
      status: "locked",
      grantId: HASH,
      amount: "1000000",
      targetHash: fake.target,
      distributionHash: commitments.distributionHash,
      materializationHash: HASH,
    });
    const other = await materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(other.lastError).toBe("PAYLOAD_CONFLICT");
    expect(fake.calls.lock).toBe(0);
    await prisma.economicEntitlement.deleteMany();
    await expect(materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain))).rejects.toMatchObject({
      code: "ENTITLEMENTS_MISSING",
    });
    await prisma.economicRevenue.deleteMany();
    await expect(materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain))).rejects.toMatchObject({
      code: "REVENUE_NOT_FOUND",
    });
  });

  it("does not let the wrong capability or a confirmed contradiction overwrite evidence", async () => {
    const { prisma, redeemed, releaseId, campaignId, assessed } = await recorded("redeem-app-004");
    const { canonicalCommitments } = await import("@/lib/fan-economy/materialization/service");
    const commitments = canonicalCommitments({
      redemptionId: redeemed.redemptionId,
      revenueId: redeemed.revenueId,
      shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
    });
    const fake = protocol({ campaignId, releaseId, distributionHash: commitments.distributionHash, materializationHash: commitments.materializationHash });
    const wrong = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, fake.chain, "moc:actor:99999999-9999-4999-8999-999999999999", FAN)
    );
    expect(wrong.lastError).toBe("PREREQUISITE_MISSING");
    expect(fake.calls.reserve).toBe(0);
    expect(fake.calls.lock).toBe(0);
    fake.seedLocked();
    await prisma.economicChainEvidence.deleteMany();
    await prisma.economicChainEvidence.create({
      data: {
        id: `evidence:testnet:${CONTRACT}:${redeemed.redemptionId}`,
        redemptionId: redeemed.redemptionId,
        revenueId: redeemed.revenueId,
        network: "testnet",
        contractId: CONTRACT,
        state: "confirmed",
        transactionHash: "ab".repeat(32),
        ledger: 12,
        materializationHash: commitments.materializationHash,
        publishedAt: new Date(),
      },
    });
    const held = await reconcileMaterialization({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(held.decision).toBe("CONFIRMED");
    expect(fake.calls.lock).toBe(0);
    fake.setRedemption(null);
    const missing = await reconcileMaterialization({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(missing.decision).toBe("INCONSISTENT");
    expect((await prisma.economicChainEvidence.findUnique({ where: { revenueId: redeemed.revenueId } }))?.transactionHash).toBe("ab".repeat(32));
  });

  it("allows one lock when two materialization calls overlap", async () => {
    const { prisma, redeemed, releaseId, campaignId, assessed } = await recorded("redeem-app-005");
    const { canonicalCommitments } = await import("@/lib/fan-economy/materialization/service");
    const commitments = canonicalCommitments({
      redemptionId: redeemed.redemptionId,
      revenueId: redeemed.revenueId,
      shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
    });
    const fake = protocol({ campaignId, releaseId, distributionHash: commitments.distributionHash, materializationHash: commitments.materializationHash });
    fake.seedCommitted();
    await Promise.all([
      materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain)),
      materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain)),
    ]);
    expect(fake.calls.lock).toBe(1);
    expect(await prisma.economicChainEvidence.count()).toBe(1);
    expect(await prisma.economicRevenue.count()).toBe(1);
    expect(await prisma.redemption.count()).toBe(1);
    const row = await prisma.economicChainEvidence.findFirst();
    expect(row?.state === "confirmed" || row?.state === "submitting").toBe(true);
  });
});
