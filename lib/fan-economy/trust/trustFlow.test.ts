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
  reverseRedemption,
  submitEvidence,
} from "@/lib/fan-economy/service";
import { distributionHash, hex32 } from "@/lib/fan-economy/trust/canonical";
import { syncRewardProjectionFromProtocol } from "@/lib/fan-economy/trust/flow";
import { startLocalTrust, type LocalSorobanTrust } from "@/lib/fan-economy/trust/localContract";
import type { FanEconomyTrustExecution, RewardTrustState } from "@/lib/fan-economy/trust/port";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";

const ARTIST = "moc:actor:a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const FAN = "moc:actor:b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2";
const COLLABORATOR = "moc:actor:c3c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3";
const UNIT = { asset: "UNIT", scale: 0 };

function remaining(grant: RewardTrustState): string {
  return (BigInt(grant.authorized) - BigInt(grant.consumed) - BigInt(grant.released)).toString();
}

describe("local trust-native flow", { timeout: 60_000 }, () => {
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

  async function grant(prisma: PrismaClient, authorized = 5n, committed = 10n) {
    const campaign = await createCampaign(
      { artistActorRef: ARTIST, title: "Campaign", committed: { units: committed, ...UNIT } },
      prisma,
      trust
    );
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: campaign.id,
        title: "Mission",
        criterion: "Note",
        maximumReward: { units: authorized, ...UNIT },
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
      { artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: authorized, ...UNIT } },
      prisma,
      trust
    );
    return { campaign, assignment, reward };
  }

  async function releaseFor(prisma: PrismaClient, title: string) {
    await prisma.actor.upsert({ where: { actorRef: ARTIST }, update: {}, create: { actorRef: ARTIST } });
    await prisma.actor.upsert({ where: { actorRef: COLLABORATOR }, update: {}, create: { actorRef: COLLABORATOR } });
    const work = await prisma.musicalWork.create({ data: { actorRef: ARTIST, title } });
    const release = await prisma.musicRelease.create({
      data: {
        workId: work.id,
        actorRef: ARTIST,
        title,
        releaseType: "single",
        language: "es",
        primaryGenre: "pop",
      },
    });
    await prisma.participation.createMany({
      data: [
        { releaseId: release.id, displayName: "Artist", actorRef: ARTIST, role: "performer", revenueSharePercent: 70 },
        {
          releaseId: release.id,
          displayName: "Collaborator",
          actorRef: COLLABORATOR,
          role: "producer",
          revenueSharePercent: 30,
        },
      ],
    });
    return release;
  }

  it("prints the trust-native path and stops before settlement", async () => {
    const prisma = await db();
    const lines: string[] = [];
    const { campaign, assignment, reward } = await grant(prisma);
    const release = await releaseFor(prisma, "Release");
    const reserved = await trust.getCampaignState(campaign.id);
    const authorized = await trust.getReward(assignment.id);
    const power = await fanDesk(FAN, prisma, trust);
    lines.push(`ARTIST ${ARTIST}`);
    lines.push(`FAN ${FAN}`);
    lines.push(`COLLABORATOR ${COLLABORATOR}`);
    lines.push(`CAMPAIGN committed=${reserved?.committed} outstanding=${reserved?.outstanding}`);
    lines.push(
      `GRANT authorized=${authorized?.authorized} consumed=${authorized?.consumed} released=${authorized?.released} remaining=${authorized ? remaining(authorized) : ""}`
    );
    lines.push(`PURCHASING_POWER ${power.purchasingPower.map((row) => row.units).join(",")}`);

    let committedBeforeLock = "";
    const recording: FanEconomyTrustExecution = {
      bindCapability: (actor) => trust.bindCapability(actor),
      commitReserve: (input) => trust.commitReserve(input),
      authorizeReward: (input) => trust.authorizeReward(input),
      releaseReward: (input) => trust.releaseReward(input),
      redeem: (input) => trust.redeem(input),
      lockRedemption: async (input) => {
        committedBeforeLock = (await trust.getRedemption(input.redemptionId))?.status ?? "";
        return trust.lockRedemption(input);
      },
      reverseRedemption: (input) => trust.reverseRedemption(input),
      getCampaignState: (id) => trust.getCampaignState(id),
      getReward: (id) => trust.getReward(id),
      getRedemption: (id) => trust.getRedemption(id),
    };
    const redeemed = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 3n, ...UNIT },
        redemptionId: "redeem-flow-001",
        releaseId: release.id,
      },
      prisma,
      recording
    );
    const after = await trust.getCampaignState(campaign.id);
    const grantAfter = await trust.getReward(assignment.id);
    const chain = await trust.getRedemption("redeem-flow-001");
    const stored = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId);
    const beneficiary = stored!.entitlements.find((row) => row.actorRef === ARTIST)!;
    const intent = await openSettlementIntent(createPrismaEconomicsStore(prisma, { joined: true }), createMemoryExecutionStore(), {
      entitlementId: beneficiary.entitlementId,
      actorRef: ARTIST,
      trustRedemption: trust,
    });
    lines.push(`CAMPAIGN committed=${after?.committed} outstanding=${after?.outstanding}`);
    lines.push(
      `GRANT authorized=${grantAfter?.authorized} consumed=${grantAfter?.consumed} released=${grantAfter?.released} remaining=${grantAfter ? remaining(grantAfter) : ""}`
    );
    lines.push(`REDEMPTION_BEFORE_LOCK ${committedBeforeLock}`);
    lines.push(
      `REDEMPTION amount=${chain?.amount} target=${chain?.targetHash} distributionHash=${chain?.distributionHash} status=${chain?.status}`
    );
    lines.push(`REVENUE ${stored?.revenue.revenueId} gross=${stored?.revenue.gross.units} origin=${stored?.revenue.origin.kind}`);
    lines.push(
      `ENTITLEMENTS ${stored?.entitlements.map((row) => `${row.actorRef.slice(-4)}:${row.shareBps}`).sort().join(" ")}`
    );
    lines.push(`SETTLEMENT ${intent.entitlementId === beneficiary.entitlementId ? "eligible" : "blocked"}`);
    lines.push("BASE_TRANSACTION none");
    console.log(lines.join("\n"));

    expect(reserved).toMatchObject({ committed: "10", outstanding: "5" });
    expect(authorized).toMatchObject({ authorized: "5", consumed: "0", released: "0" });
    expect(power.purchasingPower[0]?.units).toBe("5");
    expect(committedBeforeLock).toBe("committed");
    expect(after).toMatchObject({ committed: "10", outstanding: "5" });
    expect(grantAfter).toMatchObject({ authorized: "5", consumed: "3", released: "0" });
    expect(remaining(grantAfter!)).toBe("2");
    expect(chain?.status).toBe("locked");
    expect(chain?.amount).toBe("3");
    expect(stored?.revenue.gross.units).toBe(3n);
    expect(stored?.revenue.origin).toEqual({ kind: "redemption", id: "redeem-flow-001" });
    expect(stored?.entitlements.map((row) => row.shareBps).sort()).toEqual([3000, 7000]);
    expect(await prisma.economicRevenue.count()).toBe(1);
    expect(intent.entitlementId).toBe(beneficiary.entitlementId);
  });

  it("rejects a second redemption after Prisma is falsified and restores the projection", async () => {
    const prisma = await db();
    const { campaign, assignment, reward } = await grant(prisma);
    const release = await releaseFor(prisma, "Release");
    await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 3n, ...UNIT },
        redemptionId: "redeem-flow-002",
        releaseId: release.id,
      },
      prisma,
      trust
    );
    await prisma.rewardEntitlement.update({
      where: { id: reward.id },
      data: { consumedUnits: "0", releasedUnits: "0" },
    });
    await expect(
      redeemReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 3n, ...UNIT },
          redemptionId: "redeem-flow-002b",
          releaseId: release.id,
        },
        prisma,
        trust
      )
    ).rejects.toMatchObject({ code: "INSUFFICIENT_REMAINING" });
    const protocol = await trust.getReward(assignment.id);
    expect(protocol).toMatchObject({ authorized: "5", consumed: "3", released: "0" });
    expect(remaining(protocol!)).toBe("2");
    expect((await trust.getCampaignState(campaign.id))?.outstanding).toBe("5");
    const synced = await syncRewardProjectionFromProtocol(prisma, trust, assignment.id);
    expect(synced.consumedUnits).toBe("3");
    expect(synced.authorizedUnits).toBe("5");
    expect(await trust.getReward(assignment.id)).toEqual(protocol);
  });

  it("does not let a released amount be redeemed, even if Prisma is edited", async () => {
    const prisma = await db();
    const { campaign, assignment, reward } = await grant(prisma);
    const before = await trust.getCampaignState(campaign.id);
    await releaseReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: 3n, ...UNIT },
        commandId: "release-flow-001",
      },
      prisma,
      trust
    );
    const release = await releaseFor(prisma, "Release");
    await expect(
      redeemReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 3n, ...UNIT },
          redemptionId: "redeem-flow-003",
          releaseId: release.id,
        },
        prisma,
        trust
      )
    ).rejects.toMatchObject({ code: "INSUFFICIENT_REMAINING" });
    await prisma.rewardEntitlement.update({ where: { id: reward.id }, data: { releasedUnits: "0" } });
    await expect(
      redeemReward(
        {
          fanActorRef: FAN,
          rewardEntitlementId: reward.id,
          amount: { units: 3n, ...UNIT },
          redemptionId: "redeem-flow-003b",
          releaseId: release.id,
        },
        prisma,
        trust
      )
    ).rejects.toMatchObject({ code: "INSUFFICIENT_REMAINING" });
    const protocol = await trust.getReward(assignment.id);
    expect(protocol).toMatchObject({ authorized: "5", consumed: "0", released: "3" });
    expect(remaining(protocol!)).toBe("2");
    expect(BigInt(before!.outstanding) - BigInt((await trust.getCampaignState(campaign.id))!.outstanding)).toBe(3n);
    const synced = await syncRewardProjectionFromProtocol(prisma, trust, assignment.id);
    expect(synced.releasedUnits).toBe("3");
  });

  it("replays one redemption and rejects a changed payload", async () => {
    const prisma = await db();
    const { assignment, reward } = await grant(prisma);
    const release = await releaseFor(prisma, "Release");
    const other = await releaseFor(prisma, "Other release");
    const input = {
      fanActorRef: FAN,
      rewardEntitlementId: reward.id,
      amount: { units: 3n, ...UNIT },
      redemptionId: "redeem-flow-004",
      releaseId: release.id,
    };
    await redeemReward(input, prisma, trust);
    await redeemReward(input, prisma, trust);
    expect(await prisma.economicRevenue.count()).toBe(1);
    expect((await trust.getReward(assignment.id))?.consumed).toBe("3");
    await expect(
      redeemReward({ ...input, amount: { units: 1n, ...UNIT } }, prisma, trust)
    ).rejects.toMatchObject({ code: "REDEMPTION_PAYLOAD_CONFLICT" });
    await expect(redeemReward({ ...input, releaseId: other.id }, prisma, trust)).rejects.toMatchObject({
      code: "REDEMPTION_PAYLOAD_CONFLICT",
    });
    await prisma.participation.updateMany({
      where: { releaseId: release.id, actorRef: ARTIST },
      data: { revenueSharePercent: 60 },
    });
    await prisma.participation.updateMany({
      where: { releaseId: release.id, actorRef: COLLABORATOR },
      data: { revenueSharePercent: 40 },
    });
    await expect(redeemReward(input, prisma, trust)).rejects.toMatchObject({ code: "REDEMPTION_PAYLOAD_CONFLICT" });
    expect(await prisma.economicRevenue.count()).toBe(1);
    expect((await trust.getReward(assignment.id))?.consumed).toBe("3");
    expect((await trust.getRedemption("redeem-flow-004"))?.amount).toBe("3");
  });

  it("reverses a committed redemption and refuses a locked one", async () => {
    const prisma = await db();
    const { campaign, assignment, reward } = await grant(prisma);
    const release = await releaseFor(prisma, "Release");
    const holding: FanEconomyTrustExecution = {
      bindCapability: (actor) => trust.bindCapability(actor),
      commitReserve: (input) => trust.commitReserve(input),
      authorizeReward: (input) => trust.authorizeReward(input),
      releaseReward: (input) => trust.releaseReward(input),
      redeem: (input) => trust.redeem(input),
      lockRedemption: async () => {
        throw new Error("lock held");
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
        amount: { units: 3n, ...UNIT },
        redemptionId: "redeem-flow-005",
        releaseId: release.id,
      },
      prisma,
      holding
    );
    const outstanding = (await trust.getCampaignState(campaign.id))?.outstanding;
    await reverseRedemption({ fanActorRef: FAN, redemptionId: "redeem-flow-005" }, prisma, trust);
    expect((await trust.getRedemption("redeem-flow-005"))?.status).toBe("reversed");
    expect(await trust.getReward(assignment.id)).toMatchObject({ consumed: "0", released: "0" });
    expect((await trust.getCampaignState(campaign.id))?.outstanding).toBe(outstanding);
    const reversed = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redemptionRevenueId("redeem-flow-005"));
    expect(reversed?.revenue.status).toBe("reversed");
    expect(reversed?.entitlements.every((row) => row.status === "reversed")).toBe(true);

    const lockedReward = await grant(prisma);
    const lockedRelease = await releaseFor(prisma, "Locked release");
    await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: lockedReward.reward.id,
        amount: { units: 3n, ...UNIT },
        redemptionId: "redeem-flow-006",
        releaseId: lockedRelease.id,
      },
      prisma,
      trust
    );
    await expect(
      reverseRedemption({ fanActorRef: FAN, redemptionId: "redeem-flow-006" }, prisma, trust)
    ).rejects.toMatchObject({ code: "IRREVERSIBLE_SETTLEMENT" });
    expect((await trust.getRedemption("redeem-flow-006"))?.status).toBe("locked");
  });

  it("rotates the execution capability without moving ownership", async () => {
    const prisma = await db();
    const { campaign, assignment, reward } = await grant(prisma);
    const beforePower = await fanDesk(FAN, prisma, trust);
    const beforeGrant = await trust.getReward(assignment.id);
    const beforeCampaign = await trust.getCampaignState(campaign.id);
    const capability = await trust.capability(FAN);
    const rotated = await trust.rotateCapability(FAN);
    expect(rotated.from).toBe(capability.label);
    expect(rotated.to).not.toBe(capability.label);
    expect(rotated.actorHash).toBe(beforeGrant?.actorHash);
    expect((await trust.getCampaignState(campaign.id))?.authorityActor).toBe(beforeCampaign?.authorityActor);
    expect((await trust.getReward(assignment.id))?.actorHash).toBe(beforeGrant?.actorHash);
    expect((await fanDesk(FAN, prisma, trust)).purchasingPower).toEqual(beforePower.purchasingPower);
    await expect(
      trust.releaseAuthorizedBy(
        { assignmentId: assignment.id, fanActorRef: FAN, commandId: "release-old", amount: "1" },
        capability.label
      )
    ).rejects.toMatchObject({ code: "unauthorized" });
    await trust.releaseAuthorizedBy(
      { assignmentId: assignment.id, fanActorRef: FAN, commandId: "release-new", amount: "1" },
      rotated.to
    );
    expect((await trust.getReward(assignment.id))?.released).toBe("1");
    expect((await trust.getReward(assignment.id))?.actorHash).toBe(beforeGrant?.actorHash);
    expect(reward.fanActorRef).toBe(FAN);
  });

  it("allows only the materializer to lock", async () => {
    const prisma = await db();
    const { assignment, reward } = await grant(prisma);
    const release = await releaseFor(prisma, "Release");
    await trust.bindCapability(COLLABORATOR);
    const fan = await trust.capability(FAN);
    const artist = await trust.capability(ARTIST);
    const collaborator = await trust.capability(COLLABORATOR);
    const hash = hex32(
      distributionHash([
        { actorRef: ARTIST, shareBps: 7000 },
        { actorRef: COLLABORATOR, shareBps: 3000 },
      ])
    );
    await trust.redeem({
      redemptionId: "redeem-flow-007",
      assignmentId: assignment.id,
      fanActorRef: FAN,
      amount: "3",
      releaseId: release.id,
      distributionHash: hash,
    });
    const input = {
      redemptionId: "redeem-flow-007",
      revenueId: redemptionRevenueId("redeem-flow-007"),
      distributionHash: hash,
    };
    await expect(trust.lockAuthorizedBy(input, fan.label)).rejects.toMatchObject({ code: "unauthorized" });
    await expect(trust.lockAuthorizedBy(input, artist.label)).rejects.toMatchObject({ code: "unauthorized" });
    await expect(trust.lockAuthorizedBy(input, collaborator.label)).rejects.toMatchObject({ code: "unauthorized" });
    expect((await trust.getRedemption("redeem-flow-007"))?.status).toBe("committed");
    const locked = await trust.lockRedemption(input);
    expect(locked.status).toBe("locked");
    expect(reward.id).toBeTruthy();
  });

  it("blocks settlement until lock and leaves a sale untouched", async () => {
    const prisma = await db();
    const { reward } = await grant(prisma);
    const release = await releaseFor(prisma, "Release");
    const holding: FanEconomyTrustExecution = {
      bindCapability: (actor) => trust.bindCapability(actor),
      commitReserve: (input) => trust.commitReserve(input),
      authorizeReward: (input) => trust.authorizeReward(input),
      releaseReward: (input) => trust.releaseReward(input),
      redeem: (input) => trust.redeem(input),
      lockRedemption: async () => {
        throw new Error("lock held");
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
        amount: { units: 3n, ...UNIT },
        redemptionId: "redeem-flow-008",
        releaseId: release.id,
      },
      prisma,
      holding
    );
    const stored = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redemptionRevenueId("redeem-flow-008"));
    const beneficiary = stored!.entitlements.find((row) => row.actorRef === ARTIST)!;
    await expect(
      openSettlementIntent(createPrismaEconomicsStore(prisma, { joined: true }), createMemoryExecutionStore(), {
        entitlementId: beneficiary.entitlementId,
        actorRef: ARTIST,
        trustRedemption: trust,
      })
    ).rejects.toThrow("REDEMPTION_NOT_LOCKED");
    await trust.lockRedemption({
      redemptionId: "redeem-flow-008",
      revenueId: redemptionRevenueId("redeem-flow-008"),
      distributionHash: (await trust.getRedemption("redeem-flow-008"))!.distributionHash,
    });
    const intent = await openSettlementIntent(createPrismaEconomicsStore(prisma, { joined: true }), createMemoryExecutionStore(), {
      entitlementId: beneficiary.entitlementId,
      actorRef: ARTIST,
      trustRedemption: trust,
    });
    expect(intent.entitlementId).toBe(beneficiary.entitlementId);

    const economics = createMemoryEconomicsStore();
    await recordRevenueOnce(economics, {
      revenueId: "sale-flow-001",
      distributionId: "dist-sale-flow",
      gross: money(100n, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
      rule: { ruleId: "solo", shares: [{ actorRef: ARTIST, bps: 10_000, source: { kind: "rule" } }] },
      occurredAt: "2026-09-23T12:00:00.000Z",
    });
    const sale = (await economics.listEntitlements(ARTIST))[0];
    const saleIntent = await openSettlementIntent(economics, createMemoryExecutionStore(), {
      entitlementId: sale.entitlementId,
      actorRef: ARTIST,
      trustRedemption: {
        getRedemption: async () => {
          throw new Error("sale path must not consult redemption lock");
        },
      },
    });
    expect(saleIntent.entitlementId).toBe(sale.entitlementId);
  });

  it("hashes a distribution independently of input order", () => {
    const forward = hex32(
      distributionHash([
        { actorRef: ARTIST, shareBps: 7000 },
        { actorRef: COLLABORATOR, shareBps: 3000 },
      ])
    );
    const reverse = hex32(
      distributionHash([
        { actorRef: COLLABORATOR, shareBps: 3000 },
        { actorRef: ARTIST, shareBps: 7000 },
      ])
    );
    const changedShare = hex32(
      distributionHash([
        { actorRef: ARTIST, shareBps: 6000 },
        { actorRef: COLLABORATOR, shareBps: 4000 },
      ])
    );
    const changedActor = hex32(
      distributionHash([
        { actorRef: FAN, shareBps: 7000 },
        { actorRef: COLLABORATOR, shareBps: 3000 },
      ])
    );
    expect(forward).toBe(reverse);
    expect(changedShare).not.toBe(forward);
    expect(changedActor).not.toBe(forward);
  });
});
