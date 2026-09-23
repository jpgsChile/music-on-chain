import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createMemoryEconomicsStore,
  createMemoryExecutionStore,
  createPrismaEconomicsStore,
  money,
  MOC_PRODUCT_FEE_POLICY_V1,
  openSettlementIntent,
  recordRevenueOnce,
} from "@/lib/domain/economics";
import { redemptionRevenueId } from "@/lib/domain/fanEconomy/amounts";
import {
  acceptMission,
  authorizeReward,
  createCampaign,
  createMission,
  fanDesk,
  recordVerification,
  redeemReward,
  releaseReward,
  submitEvidence,
} from "@/lib/fan-economy/service";
import {
  actorHash,
  assignmentHash,
  campaignHash,
  distributionHash,
  hex32,
  materializationHash,
  redemptionHash,
  releaseCommandHash,
  releaseHash,
  revenueHash,
  assetHash,
} from "@/lib/fan-economy/trust/canonical";
import { protocolDisagreement, reconcileRedemption } from "@/lib/fan-economy/trust/flow";
import { startLocalTrust, type LocalSorobanTrust } from "@/lib/fan-economy/trust/localContract";
import type { FanEconomyTrustExecution } from "@/lib/fan-economy/trust/port";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";

const ARTIST = "moc:actor:11111111-1111-4111-8111-111111111111";
const FAN = "moc:actor:22222222-2222-4222-8222-222222222222";
const PARTNER = "moc:actor:44444444-4444-4444-8444-444444444444";
const OTHER = "moc:actor:55555555-5555-4555-8555-555555555555";
const USDC = { asset: "USDC", scale: 6 };

describe("Soroban trust execution", { timeout: 60_000 }, () => {
  let trust: LocalSorobanTrust;
  let client: PrismaClient | undefined;
  let file: string | undefined;

  beforeAll(() => {
    trust = startLocalTrust();
  });

  afterAll(async () => {
    await trust.stop();
    if (client) await closeIsolatedPrisma(client, file);
  });

  async function db() {
    if (client) await closeIsolatedPrisma(client, file);
    const opened = await openIsolatedPrisma();
    client = opened.client;
    file = opened.file;
    await trust.reset();
    return opened.client;
  }

  async function granted(prisma: PrismaClient) {
    const campaign = await createCampaign(
      { artistActorRef: ARTIST, title: "Campaign", committed: { units: 10_000_000n, ...USDC } },
      prisma,
      trust
    );
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: campaign.id,
        title: "Mission",
        criterion: "Note",
        maximumReward: { units: 5_000_000n, ...USDC },
        assignmentMode: "fan-accept",
      },
      prisma
    );
    const assignment = await acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma);
    const evidence = await submitEvidence(
      { fanActorRef: FAN, assignmentId: assignment.id, statement: "done" },
      prisma
    );
    await recordVerification(
      { verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: evidence.id, outcome: "accepted" },
      prisma
    );
    const reward = await authorizeReward(
      { artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: 5_000_000n, ...USDC } },
      prisma,
      trust
    );
    await prisma.actor.upsert({ where: { actorRef: ARTIST }, update: {}, create: { actorRef: ARTIST } });
    await prisma.actor.upsert({ where: { actorRef: PARTNER }, update: {}, create: { actorRef: PARTNER } });
    const work = await prisma.musicalWork.create({ data: { actorRef: ARTIST, title: "Work" } });
    const release = await prisma.musicRelease.create({
      data: {
        workId: work.id,
        actorRef: ARTIST,
        title: "Release",
        releaseType: "single",
        language: "es",
        primaryGenre: "pop",
      },
    });
    await prisma.participation.createMany({
      data: [
        { releaseId: release.id, displayName: "Artist", actorRef: ARTIST, role: "performer", revenueSharePercent: 70 },
        { releaseId: release.id, displayName: "Partner", actorRef: PARTNER, role: "producer", revenueSharePercent: 30 },
      ],
    });
    return { campaign, assignment, reward, release };
  }

  it("matches the canonical TypeScript and vector file", () => {
    const vectors = JSON.parse(
      readFileSync(path.join(process.cwd(), "contracts/soroban/fan-economy-trust/vectors.json"), "utf8")
    );
    expect(hex32(actorHash(vectors.actor.input))).toBe(vectors.actor.hash);
    expect(hex32(campaignHash(vectors.campaign.input))).toBe(vectors.campaign.hash);
    expect(hex32(assignmentHash(vectors.assignment.input))).toBe(vectors.assignment.hash);
    expect(hex32(redemptionHash(vectors.redemption.input))).toBe(vectors.redemption.hash);
    expect(hex32(releaseHash(vectors.release.input))).toBe(vectors.release.hash);
    expect(hex32(assetHash(vectors.asset.input))).toBe(vectors.asset.hash);
    expect(hex32(revenueHash(vectors.revenue.input))).toBe(vectors.revenue.hash);
    expect(hex32(releaseCommandHash(vectors.command.input))).toBe(vectors.command.hash);
    expect(hex32(distributionHash(vectors.distribution.entries))).toBe(vectors.distribution.hash);
    expect(
      hex32(
        materializationHash({
          redemptionId: vectors.materialization.redemptionId,
          revenueId: vectors.materialization.revenueId,
          distribution: distributionHash(vectors.distribution.entries),
        })
      )
    ).toBe(vectors.materialization.hash);
  });

  it("projects one protocol grant and one redemption revenue", async () => {
    const prisma = await db();
    const { reward, release } = await granted(prisma);
    const redeemed = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 2_000_000n, ...USDC },
        redemptionId: "redeem-trust-1",
        releaseId: release.id,
      },
      prisma,
      trust
    );
    const again = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 2_000_000n, ...USDC },
        redemptionId: "redeem-trust-1",
        releaseId: release.id,
      },
      prisma,
      trust
    );
    expect(again.revenueId).toBe(redeemed.revenueId);
    expect(await prisma.economicRevenue.count()).toBe(1);
    const stored = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redemptionRevenueId("redeem-trust-1"));
    expect(stored?.entitlements.map((row) => row.shareBps).sort()).toEqual([3000, 7000]);
    expect(stored?.entitlements.map((row) => row.actorRef).sort()).toEqual([ARTIST, PARTNER].sort());
    const chain = await trust.getRedemption("redeem-trust-1");
    expect(chain?.status).toBe("locked");
    expect(chain?.amount).toBe("2000000");
  });

  it("keeps a failed materialization reconcilable and blocks settlement until lock", async () => {
    const prisma = await db();
    const { assignment, reward, release } = await granted(prisma);
    const failing: FanEconomyTrustExecution = {
      bindCapability: (actor) => trust.bindCapability(actor),
      commitReserve: (input) => trust.commitReserve(input),
      authorizeReward: (input) => trust.authorizeReward(input),
      releaseReward: (input) => trust.releaseReward(input),
      redeem: (input) => trust.redeem(input),
      lockRedemption: async () => {
        throw new Error("lock unavailable");
      },
      reverseRedemption: (input) => trust.reverseRedemption(input),
      getCampaignState: (id) => trust.getCampaignState(id),
      getReward: (id) => trust.getReward(id),
      getRedemption: (id) => trust.getRedemption(id),
    };
    await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        redemptionId: "redeem-trust-2",
        releaseId: release.id,
      },
      prisma,
      failing
    );
    expect(await trust.getRedemption("redeem-trust-2")).toMatchObject({ status: "committed", amount: "1000000" });
    expect(await prisma.economicRevenue.count()).toBe(1);
    const stored = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redemptionRevenueId("redeem-trust-2"));
    const beneficiary = stored!.entitlements.find((row) => row.actorRef === ARTIST)!;
    await expect(
      openSettlementIntent(createPrismaEconomicsStore(prisma, { joined: true }), createMemoryExecutionStore(), {
        entitlementId: beneficiary.entitlementId,
        actorRef: ARTIST,
        trustRedemption: trust,
      })
    ).rejects.toThrow("REDEMPTION_NOT_LOCKED");
    const reconciled = await reconcileRedemption(
      {
        redemptionId: "redeem-trust-2",
        fanActorRef: FAN,
        releaseId: release.id,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
      },
      prisma,
      trust
    );
    expect(reconciled.state).toBe("locked");
    expect(await prisma.economicRevenue.count()).toBe(1);
    const intent = await openSettlementIntent(createPrismaEconomicsStore(prisma, { joined: true }), createMemoryExecutionStore(), {
      entitlementId: beneficiary.entitlementId,
      actorRef: ARTIST,
      trustRedemption: trust,
    });
    expect(intent.entitlementId).toBe(beneficiary.entitlementId);
    expect(assignment.id).toBeTruthy();
  });

  it("does not materialize revenue for a reversed protocol redemption", async () => {
    const prisma = await db();
    const { reward, release } = await granted(prisma);
    const prepared = await prisma.participation.findMany({ where: { releaseId: release.id } });
    expect(prepared.length).toBe(2);
    await trust.redeem({
      redemptionId: "redeem-trust-3",
      assignmentId: reward.assignmentId,
      fanActorRef: FAN,
      amount: "500000",
      releaseId: release.id,
      distributionHash: hex32(
        distributionHash([
          { actorRef: ARTIST, shareBps: 7000 },
          { actorRef: PARTNER, shareBps: 3000 },
        ])
      ),
    });
    await trust.reverseRedemption({ redemptionId: "redeem-trust-3" });
    const outcome = await reconcileRedemption(
      {
        redemptionId: "redeem-trust-3",
        fanActorRef: FAN,
        releaseId: release.id,
        rewardEntitlementId: reward.id,
        amount: { units: 500_000n, ...USDC },
      },
      prisma,
      trust
    );
    expect(outcome.state).toBe("reversed");
    expect(await prisma.economicRevenue.count()).toBe(0);
  });

  it("detects a falsified Prisma projection and keeps the protocol read", async () => {
    const prisma = await db();
    const { assignment, reward, release } = await granted(prisma);
    await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 2_000_000n, ...USDC },
        redemptionId: "redeem-trust-4",
        releaseId: release.id,
      },
      prisma,
      trust
    );
    await prisma.rewardEntitlement.update({
      where: { id: reward.id },
      data: { consumedUnits: "0", releasedUnits: "0" },
    });
    const before = await trust.getReward(assignment.id);
    const disagreement = await protocolDisagreement(prisma, trust, assignment.id);
    expect(disagreement.disagreements).toEqual(expect.arrayContaining(["consumed", "remaining"]));
    const after = await trust.getReward(assignment.id);
    expect(after).toEqual(before);
    const desk = await fanDesk(FAN, prisma, trust);
    expect(desk.purchasingPower[0]?.units).toBe("3000000");
  });

  it("isolates another actor and leaves sale settlement unchanged", async () => {
    const prisma = await db();
    const { reward, release } = await granted(prisma);
    await expect(
      redeemReward(
        {
          fanActorRef: OTHER,
          rewardEntitlementId: reward.id,
          amount: { units: 1_000_000n, ...USDC },
          redemptionId: "redeem-trust-5",
          releaseId: release.id,
        },
        prisma,
        trust
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await trust.getRedemption("redeem-trust-5")).toBeNull();
    await releaseReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        commandId: "release-trust-1",
      },
      prisma,
      trust
    );
    const protocol = await trust.getReward(reward.assignmentId);
    expect(protocol?.released).toBe("1000000");
    expect(protocol?.consumed).toBe("0");

    const economics = createMemoryEconomicsStore();
    const execution = createMemoryExecutionStore();
    await recordRevenueOnce(economics, {
      revenueId: "sale-trust-1",
      distributionId: "dist-sale-1",
      gross: money(100n, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
      rule: { ruleId: "solo", shares: [{ actorRef: ARTIST, bps: 10_000, source: { kind: "rule" } }] },
      occurredAt: "2026-09-23T12:00:00.000Z",
    });
    const entitlement = (await economics.listEntitlements(ARTIST))[0];
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ARTIST,
      trustRedemption: {
        getRedemption: async () => {
          throw new Error("sale path must not consult redemption lock");
        },
      },
    });
    expect(intent.entitlementId).toBe(entitlement.entitlementId);
  });
});
