import { afterEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  MOC_REDEMPTION_FEE_POLICY_V1,
  createPrismaEconomicsStore,
  money,
  recordRevenueOnce,
  reverseKernelEntitlement,
} from "@/lib/domain/economics";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { redemptionRevenueId } from "@/lib/domain/fanEconomy/amounts";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";
import {
  acceptMission,
  authorizeReward,
  createCampaign,
  createMission,
  fanDesk,
  recordVerification,
  redeemReward,
  releaseReward,
  reverseRedemption,
  submitEvidence,
  traceRedemption,
} from "@/lib/fan-economy/service";

const ARTIST = "moc:actor:11111111-1111-4111-8111-111111111111";
const FAN = "moc:actor:22222222-2222-4222-8222-222222222222";
const PARTNER = "moc:actor:33333333-3333-4333-8333-333333333333";
const USDC = { asset: "USDC", scale: 6 };

describe("Fan Economy vertical slice", { timeout: 30_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  async function db() {
    const opened = await openIsolatedPrisma();
    client = opened.client;
    file = opened.file;
    return opened.client;
  }

  async function releaseWith(
    prisma: PrismaClient,
    shares: { actorRef: string | null; percent: number }[]
  ) {
    const work = await prisma.musicalWork.create({
      data: { actorRef: ARTIST, title: "Synthetic work" },
    });
    await prisma.actor.upsert({
      where: { actorRef: ARTIST },
      update: {},
      create: { actorRef: ARTIST },
    });
    const release = await prisma.musicRelease.create({
      data: {
        workId: work.id,
        actorRef: ARTIST,
        title: "Synthetic release",
        releaseType: "single",
        language: "es",
        primaryGenre: "pop",
      },
    });
    for (const share of shares) {
      await prisma.participation.create({
        data: {
          releaseId: release.id,
          displayName: "Participant",
          actorRef: share.actorRef,
          role: "performer",
          revenueSharePercent: share.percent,
        },
      });
    }
    return release;
  }

  async function granted(prisma: PrismaClient, committed = 10_000_000n, authorized = 5_000_000n) {
    const campaign = await createCampaign(
      { artistActorRef: ARTIST, title: "Campaign", committed: { units: committed, ...USDC } },
      prisma
    );
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: campaign.id,
        title: "Mission",
        criterion: "Send a note",
        maximumReward: { units: authorized, ...USDC },
        assignmentMode: "fan-accept",
      },
      prisma
    );
    const assignment = await acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma);
    const evidence = await submitEvidence(
      { fanActorRef: FAN, assignmentId: assignment.id, statement: "done" },
      prisma
    );
    const verification = await recordVerification(
      {
        verifierActorRef: ARTIST,
        assignmentId: assignment.id,
        evidenceId: evidence.id,
        outcome: "accepted",
      },
      prisma
    );
    const reward = await authorizeReward(
      { artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: authorized, ...USDC } },
      prisma
    );
    return { campaign, mission, assignment, evidence, verification, reward };
  }

  it("creates a campaign and a mission", async () => {
    const prisma = await db();
    const campaign = await createCampaign(
      { artistActorRef: ARTIST, title: "Campaign", committed: { units: 1_000_000n, ...USDC } },
      prisma
    );
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: campaign.id,
        title: "Mission",
        criterion: "Listen",
        maximumReward: { units: 500_000n, ...USDC },
        assignmentMode: "fan-accept",
      },
      prisma
    );
    expect(campaign.artistActorRef).toBe(ARTIST);
    expect(mission.campaignId).toBe(campaign.id);
    expect(await prisma.campaign.count()).toBe(1);
    expect(await prisma.mission.count()).toBe(1);
  });

  it("allows one assignment per actor and mission", async () => {
    const prisma = await db();
    const { mission } = await granted(prisma);
    await expect(acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma)).rejects.toMatchObject({
      code: "ASSIGNMENT_EXISTS",
    });
    expect(await prisma.missionAssignment.count()).toBe(1);
  });

  it("rejects fan self-verification and a reward above the mission maximum", async () => {
    const prisma = await db();
    const campaign = await createCampaign(
      { artistActorRef: ARTIST, title: "Campaign", committed: { units: 10_000_000n, ...USDC } },
      prisma
    );
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: campaign.id,
        title: "Mission",
        criterion: "Note",
        maximumReward: { units: 1_000_000n, ...USDC },
        assignmentMode: "fan-accept",
      },
      prisma
    );
    const assignment = await acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma);
    const evidence = await submitEvidence(
      { fanActorRef: FAN, assignmentId: assignment.id, statement: "note" },
      prisma
    );
    await expect(
      recordVerification(
        { verifierActorRef: FAN, assignmentId: assignment.id, evidenceId: evidence.id, outcome: "accepted" },
        prisma
      )
    ).rejects.toMatchObject({ code: "FAN_CANNOT_SELF_VERIFY" });
    await recordVerification(
      { verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: evidence.id, outcome: "accepted" },
      prisma
    );
    await expect(
      authorizeReward(
        { artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: 2_000_000n, ...USDC } },
        prisma
      )
    ).rejects.toMatchObject({ code: "MAXIMUM_REWARD_EXCEEDED" });
    expect(await prisma.rewardEntitlement.count()).toBe(0);
  });

  it("authorizes one reward and refuses a second payload or extra capacity", async () => {
    const prisma = await db();
    const first = await granted(prisma, 10_000_000n, 6_000_000n);
    const again = await authorizeReward(
      { artistActorRef: ARTIST, assignmentId: first.assignment.id, amount: { units: 6_000_000n, ...USDC } },
      prisma
    );
    expect(again.id).toBe(first.reward.id);
    await expect(
      authorizeReward(
        { artistActorRef: ARTIST, assignmentId: first.assignment.id, amount: { units: 1_000_000n, ...USDC } },
        prisma
      )
    ).rejects.toMatchObject({ code: "REWARD_PAYLOAD_CONFLICT" });
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: first.campaign.id,
        title: "Second",
        criterion: "Again",
        maximumReward: { units: 6_000_000n, ...USDC },
        assignmentMode: "fan-accept",
      },
      prisma
    );
    const otherFan = "moc:actor:44444444-4444-4444-8444-444444444444";
    const assignment = await acceptMission({ fanActorRef: otherFan, missionId: mission.id }, prisma);
    const evidence = await submitEvidence(
      { fanActorRef: otherFan, assignmentId: assignment.id, statement: "more" },
      prisma
    );
    await recordVerification(
      { verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: evidence.id, outcome: "accepted" },
      prisma
    );
    await expect(
      authorizeReward(
        { artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: 6_000_000n, ...USDC } },
        prisma
      )
    ).rejects.toMatchObject({ code: "CAPACITY_EXCEEDED" });
    expect(await prisma.rewardEntitlement.count()).toBe(1);
  });

  it("derives purchasing power and redeems into one kernel revenue", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma);
    const before = await fanDesk(FAN, prisma);
    expect(before.purchasingPower).toEqual([{ units: "5000000", scale: 6, asset: "USDC" }]);
    const release = await releaseWith(prisma, [
      { actorRef: ARTIST, percent: 70 },
      { actorRef: PARTNER, percent: 30 },
    ]);
    const redeemed = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 2_000_000n, ...USDC },
        redemptionId: "redeem-001",
        releaseId: release.id,
      },
      prisma
    );
    expect(redeemed.gross).toEqual({ units: "2000000", scale: 6, asset: "USDC" });
    expect(redeemed.buyerPays).toEqual(redeemed.gross);
    expect(redeemed.policyId).toBe("moc-redemption-fee-v1");
    expect(redeemed.revenueId).toBe(redemptionRevenueId("redeem-001"));
    expect(MOC_REDEMPTION_FEE_POLICY_V1.protocolFeeBps).toBe(0);
    expect(MOC_REDEMPTION_FEE_POLICY_V1.convenienceFeeBps).toBe(0);
    expect(MOC_PRODUCT_FEE_POLICY_V1.protocolFeeBps).toBe(500);
    const stored = await createPrismaEconomicsStore(prisma).getRevenue(redeemed.revenueId);
    expect(stored?.revenue.origin).toEqual({ kind: "redemption", id: "redeem-001" });
    expect(stored?.revenue.status).toBe("recorded");
    expect(stored?.entitlements.map((row) => row.shareBps).sort()).toEqual([3000, 7000]);
    expect(stored?.entitlements.reduce((sum, row) => sum + row.amount.units, 0n)).toBe(2_000_000n);
    const after = await fanDesk(FAN, prisma);
    expect(after.purchasingPower).toEqual([{ units: "3000000", scale: 6, asset: "USDC" }]);
    await prisma.participation.updateMany({ data: { revenueSharePercent: 50 } });
    const unchanged = await createPrismaEconomicsStore(prisma).getRevenue(redeemed.revenueId);
    expect(unchanged?.entitlements.map((row) => row.shareBps).sort()).toEqual([3000, 7000]);
    const trace = await traceRedemption(FAN, "redeem-001", prisma);
    expect(JSON.stringify(trace)).not.toContain(PARTNER);
    await expect(traceRedemption(PARTNER, "redeem-001", prisma)).rejects.toBeInstanceOf(FanEconomyError);
    expect(await createPrismaEconomicsStore(prisma).listEntitlements(FAN)).toHaveLength(0);
    expect(await createPrismaEconomicsStore(prisma).listEntitlements(PARTNER)).toHaveLength(1);
  });

  it("rejects a release that is not distributable without writing", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma);
    const unbound = await releaseWith(prisma, [{ actorRef: null, percent: 100 }]);
    const short = await releaseWith(prisma, [
      { actorRef: ARTIST, percent: 60 },
      { actorRef: PARTNER, percent: 30 },
    ]);
    await expect(
      redeemReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 1_000_000n, ...USDC },
          redemptionId: "redeem-unbound",
          releaseId: unbound.id,
        },
        prisma
      )
    ).rejects.toMatchObject({ code: "PARTICIPANTS_UNBOUND" });
    await expect(
      redeemReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 1_000_000n, ...USDC },
          redemptionId: "redeem-short",
          releaseId: short.id,
        },
        prisma
      )
    ).rejects.toMatchObject({ code: "SHARES_MUST_SUM_TO_10000_BPS" });
    expect(await prisma.redemption.count()).toBe(0);
    expect((await prisma.rewardEntitlement.findUnique({ where: { id: reward.id } }))?.consumedUnits).toBe("0");
  });

  it("is idempotent for the same redemption payload and rejects a different one", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma);
    const release = await releaseWith(prisma, [{ actorRef: ARTIST, percent: 100 }]);
    const input = {
      fanActorRef: FAN,
      rewardEntitlementId: reward.id,
      amount: { units: 1_000_000n, ...USDC },
      redemptionId: "redeem-same",
      releaseId: release.id,
    };
    const first = await redeemReward(input, prisma);
    const second = await redeemReward(input, prisma);
    expect(second.idempotent).toBe(true);
    expect(second.revenueId).toBe(first.revenueId);
    expect(await prisma.economicRevenue.count()).toBe(1);
    expect(await prisma.economicEntitlement.count()).toBe(1);
    const other = await releaseWith(prisma, [{ actorRef: PARTNER, percent: 100 }]);
    await expect(redeemReward({ ...input, releaseId: other.id }, prisma)).rejects.toMatchObject({
      code: "REDEMPTION_PAYLOAD_CONFLICT",
    });
    expect((await prisma.rewardEntitlement.findUnique({ where: { id: reward.id } }))?.consumedUnits).toBe("1000000");
  });

  it("does not let release and redeem spend the same remaining", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma, 5_000_000n, 2_000_000n);
    const release = await releaseWith(prisma, [{ actorRef: ARTIST, percent: 100 }]);
    const results = await Promise.allSettled([
      redeemReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 2_000_000n, ...USDC },
          redemptionId: "redeem-race",
          releaseId: release.id,
        },
        prisma
      ),
      releaseReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 2_000_000n, ...USDC },
          commandId: "release-race-1",
        },
        prisma
      ),
    ]);
    const succeeded = results.filter((row) => row.status === "fulfilled");
    expect(succeeded).toHaveLength(1);
    const stored = await prisma.rewardEntitlement.findUnique({ where: { id: reward.id } });
    const consumed = BigInt(stored?.consumedUnits ?? "0");
    const released = BigInt(stored?.releasedUnits ?? "0");
    expect(consumed + released).toBe(2_000_000n);
    expect(consumed + released <= 2_000_000n).toBe(true);
  });

  it("releases unused reward without touching revenue", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma);
    await releaseReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        commandId: "release-001",
      },
      prisma
    );
    const again = await releaseReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        commandId: "release-001",
      },
      prisma
    );
    expect(again.idempotent).toBe(true);
    const stored = await prisma.rewardEntitlement.findUnique({ where: { id: reward.id } });
    expect(stored?.releasedUnits).toBe("1000000");
    expect(stored?.consumedUnits).toBe("0");
    expect(await prisma.economicRevenue.count()).toBe(0);
    const power = await fanDesk(FAN, prisma);
    expect(power.purchasingPower).toEqual([{ units: "4000000", scale: 6, asset: "USDC" }]);
  });

  it("reverses a redemption and refuses reversal after settlement", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma);
    const release = await releaseWith(prisma, [{ actorRef: ARTIST, percent: 100 }]);
    const redeemed = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 2_000_000n, ...USDC },
        redemptionId: "redeem-rev",
        releaseId: release.id,
      },
      prisma
    );
    const reversed = await reverseRedemption({ fanActorRef: FAN, redemptionId: "redeem-rev" }, prisma);
    expect(reversed.state).toBe("reversed");
    const rewardRow = await prisma.rewardEntitlement.findUnique({ where: { id: reward.id } });
    expect(rewardRow?.consumedUnits).toBe("0");
    expect(rewardRow?.releasedUnits).toBe("0");
    const revenue = await createPrismaEconomicsStore(prisma).getRevenue(redeemed.revenueId);
    expect(revenue?.revenue.status).toBe("reversed");
    expect(revenue?.entitlements.every((row) => row.status === "reversed")).toBe(true);
    const again = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        redemptionId: "redeem-settled",
        releaseId: release.id,
      },
      prisma
    );
    const entitlementId = again.economicEntitlementIds[0];
    await createPrismaEconomicsStore(prisma).putSettlement(
      {
        settlementId: "set-1",
        entitlementId,
        actorRef: ARTIST,
        amount: money(1_000_000n, "USDC"),
        executionLayer: "off-chain",
        status: "completed",
        createdAt: "2026-09-23T12:00:00.000Z",
      },
      {
        paymentId: "pay-1",
        settlementId: "set-1",
        amount: money(1_000_000n, "USDC"),
        status: "recorded",
        createdAt: "2026-09-23T12:00:00.000Z",
      }
    );
    await expect(
      reverseRedemption({ fanActorRef: FAN, redemptionId: "redeem-settled" }, prisma)
    ).rejects.toMatchObject({ code: "IRREVERSIBLE_SETTLEMENT" });
    expect((await prisma.redemption.findUnique({ where: { id: "redeem-settled" } }))?.state).toBe("recorded");
    expect((await prisma.rewardEntitlement.findUnique({ where: { id: reward.id } }))?.consumedUnits).toBe("1000000");
  });

  it("blocks generic reversal of redemption revenue and still reverses a sale", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma);
    const release = await releaseWith(prisma, [{ actorRef: ARTIST, percent: 100 }]);
    const redeemed = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 1_000_000n, ...USDC },
        redemptionId: "redeem-guard",
        releaseId: release.id,
      },
      prisma
    );
    const store = createPrismaEconomicsStore(prisma);
    const redemptionRevenue = await store.getRevenue(redeemed.revenueId);
    await expect(reverseKernelEntitlement(store, redemptionRevenue!.entitlements[0].entitlementId)).rejects.toThrow(
      "REDEMPTION_REVENUE_REQUIRES_CANONICAL_REVERSAL"
    );
    expect((await store.getEntitlement(redemptionRevenue!.entitlements[0].entitlementId))?.status).toBe("accrued");
    const sale = await recordRevenueOnce(store, {
      revenueId: "sale-rev-1",
      distributionId: "dist-sale-1",
      gross: money(1_000_000n, "USDC"),
      policy: MOC_PRODUCT_FEE_POLICY_V1,
      rule: { ruleId: "solo", shares: [{ actorRef: ARTIST, bps: 10_000, source: { kind: "participation", id: "p" } }] },
      sale: { saleId: "sale-rev-1", occurredAt: "2026-09-23T12:00:00.000Z" },
      occurredAt: "2026-09-23T12:00:00.000Z",
    });
    expect(sale.assessment.netDistributable.units).toBe(950_000n);
    expect(sale.assessment.buyerPays.units).toBe(1_000_000n);
    const reversed = await reverseKernelEntitlement(store, sale.entitlements[0].entitlementId);
    expect(reversed.status).toBe("reversed");
    expect((await store.getRevenue("sale-rev-1"))?.revenue.status).toBe("recorded");
    expect((await store.getRevenue("sale-rev-1"))?.revenue.origin.kind).toBe("sale");
  });

  it("rolls back the redemption when the kernel write fails", async () => {
    const prisma = await db();
    const { reward } = await granted(prisma);
    const release = await releaseWith(prisma, [{ actorRef: ARTIST, percent: 100 }]);
    await prisma.economicRevenue.create({
      data: {
        id: redemptionRevenueId("redeem-rollback"),
        originKind: "redemption",
        originId: "redeem-rollback",
        grossUnits: "1",
        protocolFeeUnits: "0",
        convenienceFeeUnits: "0",
        netUnits: "1",
        scale: 6,
        asset: "USDC",
        policyId: "moc-redemption-fee-v1",
        policyVersion: 1,
        ruleId: "from-participation",
        status: "recorded",
        occurredAt: new Date(),
      },
    });
    await expect(
      redeemReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 1_000_000n, ...USDC },
          redemptionId: "redeem-rollback",
          releaseId: release.id,
        },
        prisma
      )
    ).rejects.toThrow();
    expect(await prisma.redemption.count()).toBe(0);
    expect((await prisma.rewardEntitlement.findUnique({ where: { id: reward.id } }))?.consumedUnits).toBe("0");
    expect(await prisma.economicEntitlement.count()).toBe(0);
  });
});
