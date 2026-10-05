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
import { canonicalCommitments, materializeRedemption, type ChainReceipt, type MaterializationChain } from "@/lib/fan-economy/materialization/service";
import type { ChainSnapshot } from "@/lib/fan-economy/materialization/decision";
import { hex32, releaseHash } from "@/lib/fan-economy/trust/canonical";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";

const ARTIST = "moc:actor:11111111-1111-4111-8111-111111111111";
const FAN = "moc:actor:22222222-2222-4222-8222-222222222222";
const USDC = { asset: "USDC", scale: 6 };
const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const HASH = "11".repeat(32);

describe("economic materialization", { timeout: 30_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  async function recorded(redemptionId: string) {
    const opened = await openIsolatedPrisma();
    client = opened.client;
    file = opened.file;
    const prisma = opened.client;
    await prisma.actor.upsert({ where: { actorRef: ARTIST }, update: {}, create: { actorRef: ARTIST } });
    const work = await prisma.musicalWork.create({ data: { actorRef: ARTIST, title: "Obra" } });
    const release = await prisma.musicRelease.create({
      data: {
        workId: work.id,
        actorRef: ARTIST,
        title: "Lanzamiento",
        releaseType: "single",
        language: "es",
        primaryGenre: "pop",
      },
    });
    await prisma.participation.create({
      data: { releaseId: release.id, displayName: "Artista", actorRef: ARTIST, role: "performer", revenueSharePercent: 100 },
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
    const evidence = await submitEvidence({ fanActorRef: FAN, assignmentId: assignment.id, statement: "listo" }, prisma);
    await recordVerification(
      { verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: evidence.id, outcome: "accepted" },
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
        redemptionId,
        releaseId: release.id,
      },
      prisma
    );
    const assessed = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId);
    if (!assessed) throw new Error("REVENUE_MISSING");
    const commitments = canonicalCommitments({
      redemptionId,
      revenueId: redeemed.revenueId,
      shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
    });
    return { prisma, redeemed, commitments, rewardId: reward.id, releaseId: release.id };
  }

  function chainFor(initial: ChainSnapshot | null, expectedHash: string, distributionHash: string, targetHash = HASH) {
    let current = initial;
    const calls = { lock: 0, redeem: 0 };
    let failGet = false;
    let failRedeem = false;
    const chain: MaterializationChain = {
      async getRedemption(redemptionId) {
        if (failGet) throw new Error("RPC_FAILURE");
        const row = await client?.redemption.findUnique({ where: { id: redemptionId } });
        if (!row) throw new Error("CANONICAL_MISSING");
        return current;
      },
      async lockRedemption(input) {
        calls.lock += 1;
        current = {
          status: "locked",
          grantId: HASH,
          amount: "1000000",
          targetHash: HASH,
          distributionHash: input.distributionHash,
          materializationHash: expectedHash,
        };
        const receipt: ChainReceipt = { transactionHash: "ab".repeat(32), ledger: 5017680, redemption: current };
        return receipt;
      },
      async recover() {
        return "pending";
      },
    };
    return {
      chain,
      calls,
      failGet() {
        failGet = true;
      },
      withRedeem() {
        chain.redeemControlled = async () => {
          calls.redeem += 1;
          if (failRedeem) throw new Error("RPC_FAILURE");
          current = {
            status: "committed",
            grantId: HASH,
            amount: "1000000",
            targetHash,
            distributionHash,
            materializationHash: null,
          };
          return { transactionHash: "cd".repeat(32), ledger: 5017679, redemption: current };
        };
        return {
          failRedeem() {
            failRedeem = true;
          },
        };
      },
    };
  }

  function deps(prisma: PrismaClient, chain: MaterializationChain, controlledActorRef: string | null = null) {
    return { client: prisma, chain, network: "testnet" as const, contractId: CONTRACT, controlledActorRef };
  }

  it("materializes only after the canonical revenue exists and keeps it when Stellar fails", async () => {
    const { prisma, redeemed, commitments, rewardId, releaseId } = await recorded("redeem-mat-001");
    const targetHash = hex32(releaseHash(releaseId));
    const fake = chainFor(
      {
        status: "committed",
        grantId: HASH,
        amount: "1000000",
        targetHash,
        distributionHash: commitments.distributionHash,
        materializationHash: null,
      },
      commitments.materializationHash,
      commitments.distributionHash,
      targetHash
    );
    const before = await prisma.rewardEntitlement.findUnique({ where: { id: rewardId } });
    const proof = await materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(proof.verification).toBe("verified");
    expect(proof.transactionHash).toBe("ab".repeat(32));
    expect(proof.ledger).toBe(5017680);
    expect(proof.network).toBe("testnet");
    expect(proof.contractId).toBe(CONTRACT);
    const stored = await prisma.economicChainEvidence.findUnique({ where: { revenueId: redeemed.revenueId } });
    expect(stored?.state).toBe("confirmed");
    expect(stored?.transactionHash).toBe("ab".repeat(32));
    expect(stored?.ledger).toBe(5017680);
    expect(stored?.materializationHash).toBe(commitments.materializationHash);
    const again = await materializeRedemption({ redemptionId: redeemed.redemptionId, fanActorRef: FAN }, deps(prisma, fake.chain));
    expect(again.verification).toBe("verified");
    expect(fake.calls.lock).toBe(1);
    expect(await prisma.economicChainEvidence.count()).toBe(1);
    const after = await prisma.rewardEntitlement.findUnique({ where: { id: rewardId } });
    expect(after?.consumedUnits).toBe(before?.consumedUnits);
    const revenue = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId);
    expect(revenue?.revenue.status).toBe("recorded");

    const failed = chainFor(null, commitments.materializationHash, commitments.distributionHash);
    failed.failGet();
    const broken = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, failed.chain)
    );
    expect(broken.verification).toBe("inconsistent");
    expect((await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId))?.revenue.status).toBe("recorded");
    expect((await prisma.redemption.findUnique({ where: { id: redeemed.redemptionId } }))?.state).toBe("recorded");
  });

  it("does not submit lock when the contract redemption is missing, conflicting, or already locked", async () => {
    const { prisma, redeemed, commitments } = await recorded("redeem-mat-002");
    const missing = chainFor(null, commitments.materializationHash, commitments.distributionHash);
    const missingProof = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, missing.chain)
    );
    expect(missing.calls.lock).toBe(0);
    expect(missing.calls.redeem).toBe(0);
    expect(missingProof.lastError).toBe("PREREQUISITE_MISSING");

    await prisma.economicChainEvidence.deleteMany();
    const same = chainFor(
      {
        status: "locked",
        grantId: HASH,
        amount: "1000000",
        targetHash: HASH,
        distributionHash: commitments.distributionHash,
        materializationHash: commitments.materializationHash,
      },
      commitments.materializationHash,
      commitments.distributionHash
    );
    const sameProof = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, same.chain)
    );
    expect(same.calls.lock).toBe(0);
    expect(sameProof.publicationState).toBe("confirmed");

    await prisma.economicChainEvidence.deleteMany();
    const other = chainFor(
      {
        status: "locked",
        grantId: HASH,
        amount: "1000000",
        targetHash: HASH,
        distributionHash: commitments.distributionHash,
        materializationHash: "22".repeat(32),
      },
      commitments.materializationHash,
      commitments.distributionHash
    );
    const conflict = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, other.chain)
    );
    expect(other.calls.lock).toBe(0);
    expect(conflict.lastError).toBe("PAYLOAD_CONFLICT");
    expect(conflict.verification).toBe("conflict");
  });

  it("redeems with the controlled capability before lock and skips lock when that redeem fails", async () => {
    const { prisma, redeemed, commitments, releaseId } = await recorded("redeem-mat-003");
    const targetHash = hex32(releaseHash(releaseId));
    const ready = chainFor(null, commitments.materializationHash, commitments.distributionHash, targetHash);
    ready.withRedeem();
    const proof = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, ready.chain, FAN)
    );
    expect(ready.calls.redeem).toBe(1);
    expect(ready.calls.lock).toBe(1);
    expect(proof.verification).toBe("verified");

    await prisma.economicChainEvidence.deleteMany();
    const blocked = chainFor(null, commitments.materializationHash, commitments.distributionHash, targetHash);
    blocked.withRedeem().failRedeem();
    const failed = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, blocked.chain, FAN)
    );
    expect(blocked.calls.redeem).toBe(1);
    expect(blocked.calls.lock).toBe(0);
    expect(failed.publicationState).toBe("failed");
    expect((await prisma.redemption.findUnique({ where: { id: redeemed.redemptionId } }))?.state).toBe("recorded");
  });

  it("does not lock when the committed amount disagrees with the canonical redemption", async () => {
    const { prisma, redeemed, commitments, releaseId } = await recorded("redeem-mat-004");
    const fake = chainFor(
      {
        status: "committed",
        grantId: HASH,
        amount: "2",
        targetHash: hex32(releaseHash(releaseId)),
        distributionHash: commitments.distributionHash,
        materializationHash: null,
      },
      commitments.materializationHash,
      commitments.distributionHash
    );
    const proof = await materializeRedemption(
      { redemptionId: redeemed.redemptionId, fanActorRef: FAN },
      deps(prisma, fake.chain)
    );
    expect(fake.calls.lock).toBe(0);
    expect(proof.lastError).toBe("PAYLOAD_CONFLICT");
    expect(await prisma.economicChainEvidence.findFirst({ where: { redemptionId: redeemed.redemptionId, state: "confirmed" } })).toBeNull();
  });
});
