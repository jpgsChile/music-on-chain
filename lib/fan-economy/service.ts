import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import {
  canonicalHash,
  purchasingPower,
  redemptionRevenueId,
  remainingUnits,
  standingUnits,
  type MoneyView,
} from "@/lib/domain/fanEconomy/amounts";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import {
  createPrismaEconomicsStore,
  distributionRuleFromParticipations,
  MOC_REDEMPTION_FEE_POLICY_V1,
  recordRevenue,
  reverseEntitlement,
} from "@/lib/domain/economics";
import { moneyEquals } from "@/lib/domain/economics/money";
import {
  assertPilotVerificationAuthority,
  PILOT_VERIFICATION_POLICY_ID,
} from "@/lib/fan-economy/verificationPolicy";
import type { FanEconomyTrustExecution } from "@/lib/fan-economy/trust/port";
import {
  authorizeWithTrust,
  commitCampaignReserve,
  redeemWithTrust,
  releaseWithTrust,
  reverseWithTrust,
} from "@/lib/fan-economy/trust/flow";
import { resolveReleaseCoverUrl } from "@/lib/release/coverUrl";

type Tx = Prisma.TransactionClient;

type Amount = { units: bigint; scale: number; asset: string };

export type RedemptionView = {
  redemptionId: string;
  rewardEntitlementId: string;
  fanActorRef: string;
  releaseId: string;
  releaseTitle: string | null;
  amount: MoneyView;
  state: string;
  revenueId: string;
  gross: MoneyView;
  buyerPays: MoneyView;
  policyId: string;
  distributionId: string;
  economicEntitlementIds: string[];
  idempotent: boolean;
};

function id(prefix: string): string {
  return `${prefix}:${randomUUID()}`;
}

function view(units: bigint | string, scale: number, asset: string): MoneyView {
  return { units: units.toString(), scale, asset };
}

function asAmount(units: string, scale: number, asset: string): Amount {
  return { units: BigInt(units), scale, asset };
}

function sameMoney(a: Amount, units: bigint, scale: number, asset: string): boolean {
  return a.units === units && a.scale === scale && a.asset === asset;
}

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

async function audit(
  tx: Tx,
  input: {
    command: string;
    actorRef: string;
    authority: string;
    subjectId: string;
    priorState: unknown;
    nextState: unknown;
  }
) {
  await tx.fanEconomyTransition.create({
    data: {
      command: input.command,
      actorRef: input.actorRef,
      authority: input.authority,
      subjectId: input.subjectId,
      priorState: JSON.stringify(input.priorState),
      nextState: JSON.stringify(input.nextState),
    },
  });
}

async function requireCampaign(tx: Tx, campaignId: string, artistActorRef: string) {
  const campaign = await tx.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.artistActorRef !== artistActorRef) {
    throw new FanEconomyError("FORBIDDEN");
  }
  return campaign;
}

export async function createCampaign(
  input: { artistActorRef: string; title: string; committed: Amount },
  client: PrismaClient = getPrisma(),
  trust: FanEconomyTrustExecution | null = null
) {
  const title = input.title.trim();
  if (!title) throw new FanEconomyError("TITLE_REQUIRED");
  if (input.committed.units <= 0n) throw new FanEconomyError("INVALID_AMOUNT");
  const campaignId = id("campaign");
  if (trust) {
    await commitCampaignReserve(trust, {
      campaignId,
      artistActorRef: input.artistActorRef,
      asset: input.committed.asset,
      scale: input.committed.scale,
      units: input.committed.units,
    });
  }
  const campaign = await client.campaign.create({
    data: {
      id: campaignId,
      artistActorRef: input.artistActorRef,
      title,
      asset: input.committed.asset,
      scale: input.committed.scale,
      committedUnits: input.committed.units.toString(),
      reserveKind: "artist",
    },
  });
  return campaign;
}

export async function createMission(
  input: {
    artistActorRef: string;
    campaignId: string;
    title: string;
    criterion: string;
    maximumReward: Amount;
    assignmentMode: "fan-accept" | "policy-assign";
  },
  client: PrismaClient = getPrisma()
) {
  const title = input.title.trim();
  const criterion = input.criterion.trim();
  if (!title || !criterion) throw new FanEconomyError("TITLE_REQUIRED");
  if (input.maximumReward.units <= 0n) throw new FanEconomyError("INVALID_AMOUNT");
  if (input.assignmentMode !== "fan-accept" && input.assignmentMode !== "policy-assign") {
    throw new FanEconomyError("INVALID_ASSIGNMENT_MODE");
  }
  return client.$transaction(async (tx) => {
    const campaign = await requireCampaign(tx, input.campaignId, input.artistActorRef);
    if (campaign.asset !== input.maximumReward.asset || campaign.scale !== input.maximumReward.scale) {
      throw new FanEconomyError("ASSET_MISMATCH");
    }
    if (input.maximumReward.units > BigInt(campaign.committedUnits)) {
      throw new FanEconomyError("MAXIMUM_REWARD_EXCEEDED");
    }
    return tx.mission.create({
      data: {
        id: id("mission"),
        campaignId: campaign.id,
        title,
        criterion,
        maximumRewardUnits: input.maximumReward.units.toString(),
        asset: input.maximumReward.asset,
        scale: input.maximumReward.scale,
        assignmentMode: input.assignmentMode,
        status: "open",
      },
    });
  });
}

export async function acceptMission(
  input: { fanActorRef: string; missionId: string },
  client: PrismaClient = getPrisma()
) {
  try {
    return await client.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id: input.missionId },
        include: { campaign: true },
      });
      if (!mission || mission.status !== "open") throw new FanEconomyError("MISSION_UNAVAILABLE");
      if (mission.assignmentMode !== "fan-accept") throw new FanEconomyError("ASSIGNMENT_MODE_DENIED");
      if (mission.campaign.artistActorRef === input.fanActorRef) {
        throw new FanEconomyError("ARTIST_CANNOT_ACCEPT_OWN_MISSION");
      }
      const existing = await tx.missionAssignment.findUnique({
        where: { fanActorRef_missionId: { fanActorRef: input.fanActorRef, missionId: mission.id } },
      });
      if (existing) throw new FanEconomyError("ASSIGNMENT_EXISTS");
      return tx.missionAssignment.create({
        data: {
          id: id("assignment"),
          missionId: mission.id,
          fanActorRef: input.fanActorRef,
          state: "active",
        },
      });
    });
  } catch (error) {
    if (isUnique(error)) throw new FanEconomyError("ASSIGNMENT_EXISTS");
    throw error;
  }
}

export async function submitEvidence(
  input: { fanActorRef: string; assignmentId: string; statement: string },
  client: PrismaClient = getPrisma()
) {
  const statement = input.statement.trim();
  if (!statement) throw new FanEconomyError("EVIDENCE_REQUIRED");
  const contentHash = createHash("sha256").update(statement).digest("hex");
  return client.$transaction(async (tx) => {
    const assignment = await tx.missionAssignment.findUnique({ where: { id: input.assignmentId } });
    if (!assignment || assignment.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
    if (assignment.state !== "active") throw new FanEconomyError("ASSIGNMENT_NOT_ACTIVE");
    const evidence = await tx.evidenceRecord.create({
      data: {
        id: id("evidence"),
        assignmentId: assignment.id,
        submitterActorRef: input.fanActorRef,
        contentHash,
        // Persist the statement in locator so Artist/Fan UIs can display it.
        // contentHash remains the integrity digest. Legacy rows used inline:<hash>.
        locator: statement,
      },
    });
    await tx.missionAssignment.update({
      where: { id: assignment.id },
      data: { state: "evidence-submitted" },
    });
    return evidence;
  });
}

export async function recordVerification(
  input: {
    verifierActorRef: string;
    assignmentId: string;
    evidenceId: string;
    outcome: "accepted" | "rejected";
  },
  client: PrismaClient = getPrisma()
) {
  if (input.outcome !== "accepted" && input.outcome !== "rejected") {
    throw new FanEconomyError("INVALID_VERIFICATION");
  }
  return client.$transaction(async (tx) => {
    const assignment = await tx.missionAssignment.findUnique({
      where: { id: input.assignmentId },
      include: { mission: { include: { campaign: true } } },
    });
    if (!assignment) throw new FanEconomyError("FORBIDDEN");
    assertPilotVerificationAuthority({
      verifierActorRef: input.verifierActorRef,
      fanActorRef: assignment.fanActorRef,
      campaignArtistActorRef: assignment.mission.campaign.artistActorRef,
    });
    const evidence = await tx.evidenceRecord.findUnique({ where: { id: input.evidenceId } });
    if (!evidence || evidence.assignmentId !== assignment.id) throw new FanEconomyError("EVIDENCE_NOT_FOUND");
    await tx.verificationRecord.updateMany({
      where: { assignmentId: assignment.id, current: true },
      data: { current: false },
    });
    const verification = await tx.verificationRecord.create({
      data: {
        id: id("verification"),
        assignmentId: assignment.id,
        evidenceId: evidence.id,
        outcome: input.outcome,
        verifierActorRef: input.verifierActorRef,
        policyId: PILOT_VERIFICATION_POLICY_ID,
        current: input.outcome === "accepted",
      },
    });
    await tx.missionAssignment.update({
      where: { id: assignment.id },
      data: { state: input.outcome === "accepted" ? "verified" : "rejected" },
    });
    await audit(tx, {
      command: "recordVerification",
      actorRef: input.verifierActorRef,
      authority: PILOT_VERIFICATION_POLICY_ID,
      subjectId: assignment.id,
      priorState: { state: assignment.state },
      nextState: { outcome: input.outcome, verificationId: verification.id },
    });
    return verification;
  });
}

export async function authorizeReward(
  input: { artistActorRef: string; assignmentId: string; amount: Amount },
  client: PrismaClient = getPrisma(),
  trust: FanEconomyTrustExecution | null = null
) {
  if (input.amount.units <= 0n) throw new FanEconomyError("INVALID_AMOUNT");
  if (trust) return authorizeWithTrust(input, client, trust);
  try {
    return await authorizeRewardOnce(input, client);
  } catch (error) {
    if (!isUnique(error)) throw error;
    const reward = await client.rewardEntitlement.findUnique({ where: { assignmentId: input.assignmentId } });
    if (!reward) throw error;
    const same = sameMoney(input.amount, BigInt(reward.authorizedUnits), reward.scale, reward.asset);
    if (!same) throw new FanEconomyError("REWARD_PAYLOAD_CONFLICT");
    return reward;
  }
}

async function authorizeRewardOnce(
  input: { artistActorRef: string; assignmentId: string; amount: Amount },
  client: PrismaClient
) {
  return client.$transaction(async (tx) => {
    const assignment = await tx.missionAssignment.findUnique({
      where: { id: input.assignmentId },
      include: {
        mission: { include: { campaign: true } },
        reward: true,
        verifications: true,
      },
    });
    if (!assignment || assignment.mission.campaign.artistActorRef !== input.artistActorRef) {
      throw new FanEconomyError("FORBIDDEN");
    }
    const verification = assignment.verifications.find((row) => row.current && row.outcome === "accepted");
    if (!verification || assignment.state !== "verified") throw new FanEconomyError("VERIFICATION_REQUIRED");
    if (input.amount.asset !== assignment.mission.asset || input.amount.scale !== assignment.mission.scale) {
      throw new FanEconomyError("ASSET_MISMATCH");
    }
    if (input.amount.units > BigInt(assignment.mission.maximumRewardUnits)) {
      throw new FanEconomyError("MAXIMUM_REWARD_EXCEEDED");
    }
    if (assignment.reward) {
      const same =
        assignment.reward.verificationId === verification.id &&
        sameMoney(input.amount, BigInt(assignment.reward.authorizedUnits), assignment.reward.scale, assignment.reward.asset);
      if (!same) throw new FanEconomyError("REWARD_PAYLOAD_CONFLICT");
      return assignment.reward;
    }
    const locked = await tx.campaign.updateMany({
      where: { id: assignment.mission.campaignId, version: assignment.mission.campaign.version },
      data: { version: { increment: 1 } },
    });
    if (locked.count !== 1) throw new FanEconomyError("CONCURRENCY_CONFLICT");
    const existing = await tx.rewardEntitlement.findMany({
      where: { campaignId: assignment.mission.campaignId },
    });
    const standing = standingUnits(
      existing.map((row) => ({
        authorizedUnits: BigInt(row.authorizedUnits),
        releasedUnits: BigInt(row.releasedUnits),
      }))
    );
    if (standing + input.amount.units > BigInt(assignment.mission.campaign.committedUnits)) {
      throw new FanEconomyError("CAPACITY_EXCEEDED");
    }
    const reward = await tx.rewardEntitlement.create({
      data: {
        id: id("reward"),
        assignmentId: assignment.id,
        campaignId: assignment.mission.campaignId,
        fanActorRef: assignment.fanActorRef,
        verificationId: verification.id,
        authorizedUnits: input.amount.units.toString(),
        consumedUnits: "0",
        releasedUnits: "0",
        asset: input.amount.asset,
        scale: input.amount.scale,
      },
    });
    await audit(tx, {
      command: "authorizeReward",
      actorRef: input.artistActorRef,
      authority: "campaign-artist",
      subjectId: reward.id,
      priorState: { standing: standing.toString() },
      nextState: { authorizedUnits: reward.authorizedUnits, verificationId: verification.id },
    });
    return reward;
  }, { timeout: 20_000 });
}

async function moveReward(
  tx: Tx,
  reward: {
    id: string;
    version: number;
    consumedUnits: string;
    releasedUnits: string;
    authorizedUnits: string;
  },
  next: { consumedUnits: bigint; releasedUnits: bigint }
) {
  const moved = await tx.rewardEntitlement.updateMany({
    where: {
      id: reward.id,
      version: reward.version,
      consumedUnits: reward.consumedUnits,
      releasedUnits: reward.releasedUnits,
    },
    data: {
      consumedUnits: next.consumedUnits.toString(),
      releasedUnits: next.releasedUnits.toString(),
      version: { increment: 1 },
    },
  });
  if (moved.count !== 1) throw new FanEconomyError("CONCURRENCY_CONFLICT");
}

export async function releaseReward(
  input: { fanActorRef: string; rewardEntitlementId: string; amount: Amount; commandId: string },
  client: PrismaClient = getPrisma(),
  trust: FanEconomyTrustExecution | null = null
) {
  const commandId = input.commandId.trim();
  if (!commandId) throw new FanEconomyError("COMMAND_ID_REQUIRED");
  if (input.amount.units <= 0n) throw new FanEconomyError("INVALID_AMOUNT");
  if (trust) return releaseWithTrust({ ...input, commandId }, client, trust);
  const hash = canonicalHash({
    commandId,
    rewardEntitlementId: input.rewardEntitlementId,
    fanActorRef: input.fanActorRef,
    units: input.amount.units.toString(),
    asset: input.amount.asset,
    scale: String(input.amount.scale),
  });
  return client.$transaction(async (tx) => {
    const prior = await tx.rewardReleaseCommand.findUnique({ where: { id: commandId } });
    if (prior) {
      if (prior.payloadHash !== hash) throw new FanEconomyError("RELEASE_PAYLOAD_CONFLICT");
      return { idempotent: true as const, commandId };
    }
    const reward = await tx.rewardEntitlement.findUnique({ where: { id: input.rewardEntitlementId } });
    if (!reward || reward.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
    if (!sameMoney(input.amount, input.amount.units, reward.scale, reward.asset)) {
      throw new FanEconomyError("ASSET_MISMATCH");
    }
    const left = remainingUnits({
      authorizedUnits: BigInt(reward.authorizedUnits),
      consumedUnits: BigInt(reward.consumedUnits),
      releasedUnits: BigInt(reward.releasedUnits),
    });
    if (input.amount.units > left) throw new FanEconomyError("INSUFFICIENT_REMAINING");
    await moveReward(tx, reward, {
      consumedUnits: BigInt(reward.consumedUnits),
      releasedUnits: BigInt(reward.releasedUnits) + input.amount.units,
    });
    await tx.rewardReleaseCommand.create({
      data: {
        id: commandId,
        rewardEntitlementId: reward.id,
        fanActorRef: input.fanActorRef,
        units: input.amount.units.toString(),
        asset: input.amount.asset,
        scale: input.amount.scale,
        payloadHash: hash,
      },
    });
    await audit(tx, {
      command: "releaseReward",
      actorRef: input.fanActorRef,
      authority: "fan-owner",
      subjectId: reward.id,
      priorState: { releasedUnits: reward.releasedUnits, consumedUnits: reward.consumedUnits },
      nextState: { releasedUnits: (BigInt(reward.releasedUnits) + input.amount.units).toString() },
    });
    return { idempotent: false as const, commandId };
  });
}

async function readRedemption(client: PrismaClient | Tx, redemptionId: string, fanActorRef: string): Promise<RedemptionView> {
  const redemption = await client.redemption.findUnique({ where: { id: redemptionId } });
  if (!redemption || redemption.fanActorRef !== fanActorRef) throw new FanEconomyError("FORBIDDEN");
  const economics = createPrismaEconomicsStore(client, { joined: true });
  const assessed = await economics.getRevenue(redemption.revenueId);
  if (!assessed) throw new FanEconomyError("REVENUE_NOT_FOUND");
  const release = await client.musicRelease.findUnique({
    where: { id: redemption.releaseId },
    select: { title: true },
  });
  return {
    redemptionId: redemption.id,
    rewardEntitlementId: redemption.rewardEntitlementId,
    fanActorRef: redemption.fanActorRef,
    releaseId: redemption.releaseId,
    releaseTitle: release?.title ?? null,
    amount: view(redemption.units, redemption.scale, redemption.asset),
    state: redemption.state,
    revenueId: assessed.revenue.revenueId,
    gross: view(assessed.revenue.gross.units, assessed.revenue.gross.scale, assessed.revenue.gross.asset),
    buyerPays: view(assessed.assessment.buyerPays.units, assessed.assessment.buyerPays.scale, assessed.assessment.buyerPays.asset),
    policyId: assessed.revenue.policyId,
    distributionId: assessed.distribution.distributionId,
    economicEntitlementIds: assessed.entitlements.map((row) => row.entitlementId),
    idempotent: false,
  };
}

export async function redeemReward(
  input: {
    fanActorRef: string;
    rewardEntitlementId: string;
    amount: Amount;
    redemptionId: string;
    releaseId: string;
  },
  client: PrismaClient = getPrisma(),
  trust: FanEconomyTrustExecution | null = null
) {
  const redemptionId = input.redemptionId.trim();
  if (trust) {
    await redeemWithTrust({ ...input, redemptionId }, client, trust);
    return readRedemption(client, redemptionId, input.fanActorRef);
  }
  if (!/^[A-Za-z0-9:_-]{8,80}$/.test(redemptionId)) throw new FanEconomyError("INVALID_REDEMPTION_ID");
  if (input.amount.units <= 0n) throw new FanEconomyError("INVALID_AMOUNT");
  const hash = canonicalHash({
    redemptionId,
    rewardEntitlementId: input.rewardEntitlementId,
    fanActorRef: input.fanActorRef,
    releaseId: input.releaseId,
    units: input.amount.units.toString(),
    asset: input.amount.asset,
    scale: String(input.amount.scale),
  });
  try {
    const outcome = await client.$transaction(async (tx) => {
      const existing = await tx.redemption.findUnique({ where: { id: redemptionId } });
      if (existing) {
        if (existing.payloadHash !== hash || existing.fanActorRef !== input.fanActorRef) {
          throw new FanEconomyError("REDEMPTION_PAYLOAD_CONFLICT");
        }
        return { idempotent: true };
      }
      const reward = await tx.rewardEntitlement.findUnique({ where: { id: input.rewardEntitlementId } });
      if (!reward || reward.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
      if (input.amount.asset !== reward.asset || input.amount.scale !== reward.scale) {
        throw new FanEconomyError("ASSET_MISMATCH");
      }
      const left = remainingUnits({
        authorizedUnits: BigInt(reward.authorizedUnits),
        consumedUnits: BigInt(reward.consumedUnits),
        releasedUnits: BigInt(reward.releasedUnits),
      });
      if (input.amount.units > left) throw new FanEconomyError("INSUFFICIENT_REMAINING");
      const release = await tx.musicRelease.findUnique({ where: { id: input.releaseId } });
      if (!release) throw new FanEconomyError("RELEASE_NOT_FOUND");
      const shares = await tx.participation.findMany({
        where: { releaseId: release.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, actorRef: true, revenueSharePercent: true },
      });
      let rule;
      try {
        rule = distributionRuleFromParticipations(shares);
      } catch (error) {
        throw new FanEconomyError(error instanceof Error ? error.message : "NOT_DISTRIBUTABLE");
      }
      const revenueId = redemptionRevenueId(redemptionId);
      const assessed = recordRevenue({
        revenueId,
        distributionId: `dist:redemption:${redemptionId}`,
        gross: { units: input.amount.units, scale: input.amount.scale, asset: input.amount.asset },
        policy: MOC_REDEMPTION_FEE_POLICY_V1,
        rule,
        releaseId: release.id,
        origin: { kind: "redemption", id: redemptionId },
      });
      if (
        !moneyEquals(assessed.revenue.gross, assessed.assessment.buyerPays) ||
        assessed.assessment.buyerPays.units > assessed.revenue.gross.units ||
        assessed.revenue.policyId !== MOC_REDEMPTION_FEE_POLICY_V1.policyId
      ) {
        throw new FanEconomyError("BUYER_PAYS_ABOVE_GROSS");
      }
      await moveReward(tx, reward, {
        consumedUnits: BigInt(reward.consumedUnits) + input.amount.units,
        releasedUnits: BigInt(reward.releasedUnits),
      });
      await createPrismaEconomicsStore(tx, { joined: true }).putAssessed(assessed);
      await tx.redemption.create({
        data: {
          id: redemptionId,
          rewardEntitlementId: reward.id,
          fanActorRef: input.fanActorRef,
          releaseId: release.id,
          units: input.amount.units.toString(),
          asset: input.amount.asset,
          scale: input.amount.scale,
          payloadHash: hash,
          revenueId,
          state: "recorded",
        },
      });
      await audit(tx, {
        command: "redeemReward",
        actorRef: input.fanActorRef,
        authority: "fan-owner",
        subjectId: redemptionId,
        priorState: { consumedUnits: reward.consumedUnits },
        nextState: { revenueId, units: input.amount.units.toString() },
      });
      return { idempotent: false };
    }, { timeout: 20_000 });
    const viewResult = await readRedemption(client, redemptionId, input.fanActorRef);
    return { ...viewResult, idempotent: outcome.idempotent };
  } catch (error) {
    if (!isUnique(error)) throw error;
    const existing = await client.redemption.findUnique({ where: { id: redemptionId } });
    if (existing?.payloadHash === hash && existing.fanActorRef === input.fanActorRef) {
      const viewResult = await readRedemption(client, redemptionId, input.fanActorRef);
      return { ...viewResult, idempotent: true };
    }
    if (existing) throw new FanEconomyError("REDEMPTION_PAYLOAD_CONFLICT");
    throw error;
  }
}

export async function reverseRedemption(
  input: { fanActorRef: string; redemptionId: string },
  client: PrismaClient = getPrisma(),
  trust: FanEconomyTrustExecution | null = null
) {
  if (trust) {
    await reverseWithTrust(input, client, trust);
    return readRedemption(client, input.redemptionId, input.fanActorRef);
  }
  const outcome = await client.$transaction(async (tx) => {
    const redemption = await tx.redemption.findUnique({ where: { id: input.redemptionId } });
    if (!redemption || redemption.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
    if (redemption.state === "reversed") return { idempotent: true };
    const reward = await tx.rewardEntitlement.findUnique({ where: { id: redemption.rewardEntitlementId } });
    if (!reward) throw new FanEconomyError("REWARD_NOT_FOUND");
    const economics = createPrismaEconomicsStore(tx, { joined: true });
    const assessed = await economics.getRevenue(redemption.revenueId);
    if (!assessed || assessed.revenue.origin.kind !== "redemption" || assessed.revenue.origin.id !== redemption.id) {
      throw new FanEconomyError("REDEMPTION_REVENUE_MISMATCH");
    }
    for (const entitlement of assessed.entitlements) {
      if (entitlement.status === "settled" || (await economics.hasSettlementFor(entitlement.entitlementId))) {
        throw new FanEconomyError("IRREVERSIBLE_SETTLEMENT");
      }
    }
    const amount = BigInt(redemption.units);
    if (BigInt(reward.consumedUnits) < amount) throw new FanEconomyError("INSUFFICIENT_CONSUMED");
    await moveReward(tx, reward, {
      consumedUnits: BigInt(reward.consumedUnits) - amount,
      releasedUnits: BigInt(reward.releasedUnits),
    });
    for (const entitlement of assessed.entitlements) {
      if (entitlement.status === "reversed") continue;
      await economics.putEntitlement(reverseEntitlement(entitlement));
    }
    await economics.markRevenueReversed(assessed.revenue.revenueId);
    await tx.redemption.update({
      where: { id: redemption.id },
      data: { state: "reversed", reversedAt: new Date() },
    });
    await audit(tx, {
      command: "reverseRedemption",
      actorRef: input.fanActorRef,
      authority: "fan-request",
      subjectId: redemption.id,
      priorState: { state: "recorded", consumedUnits: reward.consumedUnits },
      nextState: { state: "reversed", revenueStatus: "reversed" },
    });
    return { idempotent: false };
  }, { timeout: 20_000 });
  const viewResult = await readRedemption(client, input.redemptionId, input.fanActorRef);
  return { ...viewResult, idempotent: outcome.idempotent };
}

export async function artistDesk(artistActorRef: string, client: PrismaClient = getPrisma()) {
  const campaigns = await client.campaign.findMany({
    where: { artistActorRef },
    orderBy: { createdAt: "asc" },
    include: {
      missions: {
        orderBy: { createdAt: "asc" },
        include: {
          assignments: {
            orderBy: { createdAt: "asc" },
            include: { reward: true, verifications: true, evidence: { orderBy: { createdAt: "desc" }, take: 1 } },
          },
        },
      },
    },
  });
  return campaigns.map((campaign) => {
    const rewards = campaign.missions.flatMap((mission) =>
      mission.assignments.flatMap((assignment) => (assignment.reward ? [assignment.reward] : []))
    );
    const standing = standingUnits(
      rewards.map((row) => ({
        authorizedUnits: BigInt(row.authorizedUnits),
        releasedUnits: BigInt(row.releasedUnits),
      }))
    );
    const committed = BigInt(campaign.committedUnits);
    return {
      id: campaign.id,
      title: campaign.title,
      committed: view(committed, campaign.scale, campaign.asset),
      standing: view(standing, campaign.scale, campaign.asset),
      availableToAuthorize: view(committed - standing, campaign.scale, campaign.asset),
      missions: campaign.missions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        criterion: mission.criterion,
        assignmentMode: mission.assignmentMode,
        maximumReward: view(mission.maximumRewardUnits, mission.scale, mission.asset),
        assignments: mission.assignments.map((assignment) => {
          const evidenceRow = assignment.evidence[0] ?? null;
          return {
            id: assignment.id,
            state: assignment.state,
            fanActorRef: assignment.fanActorRef,
            participantLabel: participantLabel(assignment.fanActorRef),
            verification: assignment.verifications.find((row) => row.current)?.outcome ?? null,
            evidenceId: evidenceRow?.id ?? null,
            evidenceText: evidenceDisplayText(evidenceRow?.locator),
            reward: assignment.reward
              ? {
                  id: assignment.reward.id,
                  authorized: view(assignment.reward.authorizedUnits, assignment.reward.scale, assignment.reward.asset),
                  consumed: view(assignment.reward.consumedUnits, assignment.reward.scale, assignment.reward.asset),
                  released: view(assignment.reward.releasedUnits, assignment.reward.scale, assignment.reward.asset),
                  remaining: view(
                    remainingUnits({
                      authorizedUnits: BigInt(assignment.reward.authorizedUnits),
                      consumedUnits: BigInt(assignment.reward.consumedUnits),
                      releasedUnits: BigInt(assignment.reward.releasedUnits),
                    }),
                    assignment.reward.scale,
                    assignment.reward.asset
                  ),
                }
              : null,
          };
        }),
      })),
    };
  });
}

export async function fanDesk(
  fanActorRef: string,
  client: PrismaClient = getPrisma(),
  trust: FanEconomyTrustExecution | null = null
) {
  const rewards = await client.rewardEntitlement.findMany({ where: { fanActorRef } });
  const protocolRemaining = new Map<string, bigint>();
  if (trust) {
    for (const row of rewards) {
      const protocol = await trust.getReward(row.assignmentId);
      if (!protocol) continue;
      protocolRemaining.set(
        row.assignmentId,
        BigInt(protocol.authorized) - BigInt(protocol.consumed) - BigInt(protocol.released)
      );
    }
  }
  const remainingOf = (row: { assignmentId: string; authorizedUnits: string; consumedUnits: string; releasedUnits: string }) =>
    protocolRemaining.get(row.assignmentId) ??
    remainingUnits({
      authorizedUnits: BigInt(row.authorizedUnits),
      consumedUnits: BigInt(row.consumedUnits),
      releasedUnits: BigInt(row.releasedUnits),
    });
  const power = purchasingPower(
    rewards.map((row) => ({
      remainingUnits: remainingOf(row),
      asset: row.asset,
      scale: row.scale,
    }))
  );
  const openMissions = await client.mission.findMany({
    where: { status: "open", assignmentMode: "fan-accept" },
    include: { campaign: true, assignments: { where: { fanActorRef } } },
    orderBy: { createdAt: "asc" },
  });
  const assignments = await client.missionAssignment.findMany({
    where: { fanActorRef },
    include: { mission: { include: { campaign: true } }, reward: true, evidence: true },
    orderBy: { createdAt: "asc" },
  });
  const redemptions = await client.redemption.findMany({
    where: { fanActorRef },
    orderBy: { createdAt: "asc" },
  });
  const targets = await client.musicRelease.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, coverUrl: true, actorRef: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const artistRefs = [
    ...openMissions.map((mission) => mission.campaign.artistActorRef),
    ...targets.map((target) => target.actorRef),
  ];
  const names = await artisticNames(client, artistRefs);
  return {
    purchasingPower: power,
    missions: openMissions
      .filter((mission) => mission.assignments.length === 0 && mission.campaign.artistActorRef !== fanActorRef)
      .map((mission) => ({
        id: mission.id,
        title: mission.title,
        criterion: mission.criterion,
        campaignTitle: mission.campaign.title,
        artistName: names.get(mission.campaign.artistActorRef) ?? null,
        maximumReward: view(mission.maximumRewardUnits, mission.scale, mission.asset),
      })),
    assignments: assignments.map((assignment) => {
      const latestEvidence = [...assignment.evidence].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )[0];
      return {
        id: assignment.id,
        state: assignment.state,
        missionTitle: assignment.mission.title,
        campaignTitle: assignment.mission.campaign.title,
        evidenceIds: assignment.evidence.map((row) => row.id),
        evidenceText: evidenceDisplayText(latestEvidence?.locator),
        reward: assignment.reward
          ? {
              id: assignment.reward.id,
              remaining: view(
                remainingOf(assignment.reward),
                assignment.reward.scale,
                assignment.reward.asset
              ),
              authorized: view(
                assignment.reward.authorizedUnits,
                assignment.reward.scale,
                assignment.reward.asset
              ),
              asset: assignment.reward.asset,
              scale: assignment.reward.scale,
            }
          : null,
      };
    }),
    redemptions: await Promise.all(
      redemptions.map(async (row) => {
        const traced = await readRedemption(client, row.id, fanActorRef);
        return {
          redemptionId: traced.redemptionId,
          releaseId: traced.releaseId,
          releaseTitle: traced.releaseTitle,
          amount: traced.amount,
          state: traced.state,
          revenueId: traced.revenueId,
          economicEntitlementIds: traced.economicEntitlementIds,
          participants: await redemptionParticipants(client, traced.revenueId, traced.releaseId),
        };
      })
    ),
    targets: targets.map((target) => ({
      id: target.id,
      title: target.title,
      coverUrl: resolveReleaseCoverUrl(target.coverUrl),
      artistName: names.get(target.actorRef) ?? null,
    })),
  };
}

async function artisticNames(client: PrismaClient, actorRefs: string[]) {
  const unique = [...new Set(actorRefs.filter(Boolean))];
  if (unique.length === 0) return new Map<string, string>();
  const rows = await client.artistProfile.findMany({
    where: { actorRef: { in: unique } },
    select: { actorRef: true, artisticName: true },
  });
  return new Map(rows.flatMap((row) => (row.actorRef && row.artisticName ? [[row.actorRef, row.artisticName] as const] : [])));
}

async function redemptionParticipants(client: PrismaClient, revenueId: string, releaseId: string) {
  const entitlements = await client.economicEntitlement.findMany({
    where: { revenueId },
    select: { actorRef: true, shareBps: true },
    orderBy: { shareBps: "desc" },
  });
  if (entitlements.length === 0) return [];
  const names = await artisticNames(client, entitlements.map((row) => row.actorRef));
  const participations = await client.participation.findMany({
    where: { releaseId, actorRef: { in: entitlements.map((row) => row.actorRef) } },
    select: { actorRef: true, displayName: true },
  });
  const byParticipation = new Map(
    participations.flatMap((row) => (row.actorRef ? [[row.actorRef, row.displayName] as const] : []))
  );
  return entitlements.map((row) => ({
    name: names.get(row.actorRef) || byParticipation.get(row.actorRef) || null,
    shareBps: row.shareBps,
  }));
}

export async function trustProof(
  fanActorRef: string,
  redemptionId: string,
  client: PrismaClient = getPrisma(),
  trust: FanEconomyTrustExecution | null = null
) {
  if (!trust) return { published: false as const };
  const redemption = await client.redemption.findUnique({
    where: { id: redemptionId },
    include: { reward: true },
  });
  if (!redemption || redemption.fanActorRef !== fanActorRef) throw new FanEconomyError("FORBIDDEN");
  const chain = await trust.getRedemption(redemptionId);
  if (!chain) return { published: false as const };
  const network = process.env.STELLAR_NETWORK?.trim() ?? "";
  const contractId = process.env.MOC_FAN_ECONOMY_CONTRACT_ID?.trim() ?? "";
  if (network !== "testnet" || !contractId) return { published: false as const };
  const reward = await trust.getReward(redemption.reward.assignmentId);
  return {
    published: true as const,
    network,
    contractId,
    status: chain.status,
    actorHash: reward?.actorHash ?? null,
    redemptionId,
    distributionHash: chain.distributionHash,
  };
}

export async function traceRedemption(fanActorRef: string, redemptionId: string, client: PrismaClient = getPrisma()) {
  return readRedemption(client, redemptionId, fanActorRef);
}

/** Legacy rows used `inline:<sha256>`; those cannot recover the original statement. */
function evidenceDisplayText(locator: string | null | undefined): string | null {
  if (!locator) return null;
  if (/^inline:[a-f0-9]{64}$/i.test(locator)) return null;
  return locator;
}

function participantLabel(actorRef: string): string {
  const id = actorRef.startsWith("moc:actor:") ? actorRef.slice("moc:actor:".length) : actorRef;
  return id.slice(0, 8);
}
