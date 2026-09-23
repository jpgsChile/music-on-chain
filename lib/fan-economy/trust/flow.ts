import type { Prisma, PrismaClient } from "@prisma/client";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { canonicalHash, redemptionRevenueId, remainingUnits } from "@/lib/domain/fanEconomy/amounts";
import {
  createPrismaEconomicsStore,
  distributionRuleFromParticipations,
  MOC_REDEMPTION_FEE_POLICY_V1,
  recordRevenue,
  reverseEntitlement,
} from "@/lib/domain/economics";
import { moneyEquals } from "@/lib/domain/economics/money";
import { distributionHash, hex32, releaseHash } from "@/lib/fan-economy/trust/canonical";
import { TrustCallError } from "@/lib/fan-economy/trust/localContract";
import type { FanEconomyTrustExecution, RewardTrustState } from "@/lib/fan-economy/trust/port";

type Tx = Prisma.TransactionClient;
type Amount = { units: bigint; scale: number; asset: string };

function mapTrust(error: unknown, conflict: string): never {
  if (error instanceof TrustCallError) {
    const code =
      error.code === "above_committed"
        ? "CAPACITY_EXCEEDED"
        : error.code === "payload_conflict"
          ? conflict
          : error.code === "insufficient_remaining"
            ? "INSUFFICIENT_REMAINING"
            : error.code === "locked"
              ? "IRREVERSIBLE_SETTLEMENT"
              : error.code === "amount_invalid"
                ? "INVALID_AMOUNT"
                : error.code === "asset_mismatch"
                  ? "ASSET_MISMATCH"
                  : "TRUST_REJECTED";
    throw new FanEconomyError(code);
  }
  throw error;
}

async function audit(
  tx: Tx,
  input: { command: string; actorRef: string; authority: string; subjectId: string; priorState: unknown; nextState: unknown }
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

export async function commitCampaignReserve(
  trust: FanEconomyTrustExecution,
  input: { campaignId: string; artistActorRef: string; asset: string; scale: number; units: bigint }
) {
  await trust.bindCapability(input.artistActorRef);
  try {
    await trust.commitReserve({
      campaignId: input.campaignId,
      authorityActorRef: input.artistActorRef,
      asset: input.asset,
      scale: input.scale,
      amount: input.units.toString(),
    });
  } catch (error) {
    mapTrust(error, "REWARD_PAYLOAD_CONFLICT");
  }
}

export async function authorizeWithTrust(
  input: { artistActorRef: string; assignmentId: string; amount: Amount },
  client: PrismaClient,
  trust: FanEconomyTrustExecution
) {
  const assignment = await client.missionAssignment.findUnique({
    where: { id: input.assignmentId },
    include: { mission: { include: { campaign: true } }, reward: true, verifications: true },
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
  await trust.bindCapability(input.artistActorRef);
  await trust.bindCapability(assignment.fanActorRef);
  let protocol: RewardTrustState;
  try {
    protocol = await trust.authorizeReward({
      assignmentId: assignment.id,
      campaignId: assignment.mission.campaignId,
      authorityActorRef: input.artistActorRef,
      fanActorRef: assignment.fanActorRef,
      amount: input.amount.units.toString(),
    });
  } catch (error) {
    mapTrust(error, "REWARD_PAYLOAD_CONFLICT");
  }
  const confirmed = await trust.getReward(assignment.id);
  if (!confirmed || confirmed.authorized !== protocol.authorized) throw new FanEconomyError("TRUST_REJECTED");
  return client.$transaction(async (tx) => {
    const existing = await tx.rewardEntitlement.findUnique({ where: { assignmentId: assignment.id } });
    if (existing) {
      return tx.rewardEntitlement.update({
        where: { id: existing.id },
        data: {
          authorizedUnits: confirmed.authorized,
          consumedUnits: confirmed.consumed,
          releasedUnits: confirmed.released,
        },
      });
    }
    const reward = await tx.rewardEntitlement.create({
      data: {
        id: `reward:${assignment.id}`,
        assignmentId: assignment.id,
        campaignId: assignment.mission.campaignId,
        fanActorRef: assignment.fanActorRef,
        verificationId: verification.id,
        authorizedUnits: confirmed.authorized,
        consumedUnits: confirmed.consumed,
        releasedUnits: confirmed.released,
        asset: input.amount.asset,
        scale: input.amount.scale,
      },
    });
    await audit(tx, {
      command: "authorizeReward",
      actorRef: input.artistActorRef,
      authority: "trust-execution",
      subjectId: reward.id,
      priorState: null,
      nextState: { authorizedUnits: confirmed.authorized },
    });
    return reward;
  });
}

export async function releaseWithTrust(
  input: { fanActorRef: string; rewardEntitlementId: string; amount: Amount; commandId: string },
  client: PrismaClient,
  trust: FanEconomyTrustExecution
) {
  const reward = await client.rewardEntitlement.findUnique({ where: { id: input.rewardEntitlementId } });
  if (!reward || reward.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
  if (input.amount.asset !== reward.asset || input.amount.scale !== reward.scale) {
    throw new FanEconomyError("ASSET_MISMATCH");
  }
  await trust.bindCapability(input.fanActorRef);
  try {
    await trust.releaseReward({
      assignmentId: reward.assignmentId,
      fanActorRef: input.fanActorRef,
      commandId: input.commandId,
      amount: input.amount.units.toString(),
    });
  } catch (error) {
    mapTrust(error, "RELEASE_PAYLOAD_CONFLICT");
  }
  const confirmed = await trust.getReward(reward.assignmentId);
  if (!confirmed) throw new FanEconomyError("TRUST_REJECTED");
  const hash = canonicalHash({
    commandId: input.commandId,
    rewardEntitlementId: reward.id,
    fanActorRef: input.fanActorRef,
    units: input.amount.units.toString(),
    asset: input.amount.asset,
    scale: String(input.amount.scale),
  });
  await client.$transaction(async (tx) => {
    await tx.rewardEntitlement.update({
      where: { id: reward.id },
      data: {
        authorizedUnits: confirmed.authorized,
        consumedUnits: confirmed.consumed,
        releasedUnits: confirmed.released,
        version: { increment: 1 },
      },
    });
    await tx.rewardReleaseCommand.upsert({
      where: { id: input.commandId },
      update: {},
      create: {
        id: input.commandId,
        rewardEntitlementId: reward.id,
        fanActorRef: input.fanActorRef,
        units: input.amount.units.toString(),
        asset: input.amount.asset,
        scale: input.amount.scale,
        payloadHash: hash,
      },
    });
  });
  return { idempotent: confirmed.released === reward.releasedUnits, commandId: input.commandId };
}

async function distributionForRelease(tx: Tx, releaseId: string) {
  const release = await tx.musicRelease.findUnique({ where: { id: releaseId } });
  if (!release) throw new FanEconomyError("RELEASE_NOT_FOUND");
  const shares = await tx.participation.findMany({
    where: { releaseId },
    orderBy: { createdAt: "asc" },
    select: { id: true, actorRef: true, revenueSharePercent: true },
  });
  let rule;
  try {
    rule = distributionRuleFromParticipations(shares);
  } catch (error) {
    throw new FanEconomyError(error instanceof Error ? error.message : "NOT_DISTRIBUTABLE");
  }
  const hash = hex32(distributionHash(rule.shares.map((share) => ({ actorRef: share.actorRef, shareBps: share.bps }))));
  return { release, rule, hash };
}

async function materialize(
  tx: Tx,
  input: {
    redemptionId: string;
    rewardId: string;
    fanActorRef: string;
    releaseId: string;
    amount: Amount;
    distributionHash: string;
    payloadHash: string;
  }
) {
  const existing = await tx.redemption.findUnique({ where: { id: input.redemptionId } });
  if (existing) {
    if (existing.payloadHash !== input.payloadHash) throw new FanEconomyError("REDEMPTION_PAYLOAD_CONFLICT");
    const economics = createPrismaEconomicsStore(tx, { joined: true });
    if (await economics.getRevenue(existing.revenueId)) return existing.revenueId;
  }
  const { rule } = await distributionForRelease(tx, input.releaseId);
  const again = hex32(distributionHash(rule.shares.map((share) => ({ actorRef: share.actorRef, shareBps: share.bps }))));
  if (again !== input.distributionHash) throw new FanEconomyError("DISTRIBUTION_COMMITMENT_MISMATCH");
  const revenueId = redemptionRevenueId(input.redemptionId);
  const assessed = recordRevenue({
    revenueId,
    distributionId: `dist:redemption:${input.redemptionId}`,
    gross: { units: input.amount.units, scale: input.amount.scale, asset: input.amount.asset },
    policy: MOC_REDEMPTION_FEE_POLICY_V1,
    rule,
    releaseId: input.releaseId,
    origin: { kind: "redemption", id: input.redemptionId },
  });
  if (!moneyEquals(assessed.revenue.gross, assessed.assessment.buyerPays)) {
    throw new FanEconomyError("BUYER_PAYS_ABOVE_GROSS");
  }
  await createPrismaEconomicsStore(tx, { joined: true }).putAssessed(assessed);
  if (!existing) {
    await tx.redemption.create({
      data: {
        id: input.redemptionId,
        rewardEntitlementId: input.rewardId,
        fanActorRef: input.fanActorRef,
        releaseId: input.releaseId,
        units: input.amount.units.toString(),
        asset: input.amount.asset,
        scale: input.amount.scale,
        payloadHash: input.payloadHash,
        revenueId,
        state: "recorded",
      },
    });
  }
  return revenueId;
}

export async function redeemWithTrust(
  input: {
    fanActorRef: string;
    rewardEntitlementId: string;
    amount: Amount;
    redemptionId: string;
    releaseId: string;
  },
  client: PrismaClient,
  trust: FanEconomyTrustExecution
) {
  const reward = await client.rewardEntitlement.findUnique({ where: { id: input.rewardEntitlementId } });
  if (!reward || reward.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
  if (input.amount.asset !== reward.asset || input.amount.scale !== reward.scale) {
    throw new FanEconomyError("ASSET_MISMATCH");
  }
  const prepared = await client.$transaction((tx) => distributionForRelease(tx, input.releaseId));
  const payloadHash = canonicalHash({
    redemptionId: input.redemptionId,
    rewardEntitlementId: reward.id,
    fanActorRef: input.fanActorRef,
    releaseId: input.releaseId,
    units: input.amount.units.toString(),
    asset: input.amount.asset,
    scale: String(input.amount.scale),
  });
  await trust.bindCapability(input.fanActorRef);
  try {
    await trust.redeem({
      redemptionId: input.redemptionId,
      assignmentId: reward.assignmentId,
      fanActorRef: input.fanActorRef,
      amount: input.amount.units.toString(),
      releaseId: input.releaseId,
      distributionHash: prepared.hash,
    });
  } catch (error) {
    mapTrust(error, "REDEMPTION_PAYLOAD_CONFLICT");
  }
  const committed = await trust.getRedemption(input.redemptionId);
  if (
    !committed ||
    committed.status === "reversed" ||
    committed.amount !== input.amount.units.toString() ||
    committed.distributionHash !== prepared.hash ||
    committed.targetHash !== hex32(releaseHash(input.releaseId))
  ) {
    throw new FanEconomyError("TRUST_REJECTED");
  }
  let revenueId: string;
  try {
    revenueId = await client.$transaction((tx) =>
      materialize(tx, {
        redemptionId: input.redemptionId,
        rewardId: reward.id,
        fanActorRef: input.fanActorRef,
        releaseId: input.releaseId,
        amount: input.amount,
        distributionHash: prepared.hash,
        payloadHash,
      })
    );
  } catch (error) {
    if (error instanceof FanEconomyError) throw error;
    throw new FanEconomyError("REDEMPTION_RECONCILABLE");
  }
  const confirmed = await trust.getReward(reward.assignmentId);
  if (confirmed) {
    await client.rewardEntitlement.update({
      where: { id: reward.id },
      data: {
        consumedUnits: confirmed.consumed,
        releasedUnits: confirmed.released,
        authorizedUnits: confirmed.authorized,
      },
    });
  }
  let trustStatus: "committed" | "locked" = committed.status === "locked" ? "locked" : "committed";
  try {
    const locked = await trust.lockRedemption({
      redemptionId: input.redemptionId,
      revenueId,
      distributionHash: prepared.hash,
    });
    if (locked.status === "locked") trustStatus = "locked";
  } catch {
    trustStatus = "committed";
  }
  return { revenueId, trustStatus, distributionHash: prepared.hash };
}

export async function reverseWithTrust(
  input: { fanActorRef: string; redemptionId: string },
  client: PrismaClient,
  trust: FanEconomyTrustExecution
) {
  const redemption = await client.redemption.findUnique({ where: { id: input.redemptionId } });
  if (redemption && redemption.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
  const chain = await trust.getRedemption(input.redemptionId);
  if (!chain) throw new FanEconomyError("REDEMPTION_NOT_FOUND");
  if (chain.status === "locked") throw new FanEconomyError("IRREVERSIBLE_SETTLEMENT");
  if (redemption) {
    const economics = createPrismaEconomicsStore(client, { joined: true });
    const assessed = await economics.getRevenue(redemption.revenueId);
    if (assessed) {
      for (const entitlement of assessed.entitlements) {
        if (entitlement.status === "settled" || (await economics.hasSettlementFor(entitlement.entitlementId))) {
          throw new FanEconomyError("IRREVERSIBLE_SETTLEMENT");
        }
      }
    }
  }
  try {
    await trust.reverseRedemption({ redemptionId: input.redemptionId });
  } catch (error) {
    mapTrust(error, "REDEMPTION_PAYLOAD_CONFLICT");
  }
  if (!redemption) return;
  const reward = await client.rewardEntitlement.findUnique({ where: { id: redemption.rewardEntitlementId } });
  await client.$transaction(async (tx) => {
    const economics = createPrismaEconomicsStore(tx, { joined: true });
    const assessed = await economics.getRevenue(redemption.revenueId);
    if (assessed && assessed.revenue.status !== "reversed") {
      for (const entitlement of assessed.entitlements) {
        if (entitlement.status === "reversed") continue;
        await economics.putEntitlement(reverseEntitlement(entitlement));
      }
      await economics.markRevenueReversed(assessed.revenue.revenueId);
    }
    if (redemption.state !== "reversed") {
      await tx.redemption.update({
        where: { id: redemption.id },
        data: { state: "reversed", reversedAt: new Date() },
      });
    }
    if (reward) {
      const protocol = await trust.getReward(reward.assignmentId);
      if (protocol) {
        await tx.rewardEntitlement.update({
          where: { id: reward.id },
          data: {
            consumedUnits: protocol.consumed,
            releasedUnits: protocol.released,
            authorizedUnits: protocol.authorized,
          },
        });
      }
    }
  });
}

export async function reconcileRedemption(
  input: { redemptionId: string; fanActorRef: string; releaseId: string; rewardEntitlementId: string; amount: Amount },
  client: PrismaClient,
  trust: FanEconomyTrustExecution
) {
  const chain = await trust.getRedemption(input.redemptionId);
  if (!chain) throw new FanEconomyError("REDEMPTION_NOT_FOUND");
  if (chain.status === "reversed") {
    const existing = await client.redemption.findUnique({ where: { id: input.redemptionId } });
    if (existing && existing.state !== "reversed") {
      await reverseWithTrust({ fanActorRef: input.fanActorRef, redemptionId: input.redemptionId }, client, trust);
    }
    const revenue = await createPrismaEconomicsStore(client, { joined: true }).getRevenue(redemptionRevenueId(input.redemptionId));
    if (revenue && revenue.revenue.status !== "reversed") throw new FanEconomyError("REVERSED_REDEMPTION_STILL_MATERIALIZED");
    return { state: "reversed" as const };
  }
  const payloadHash = canonicalHash({
    redemptionId: input.redemptionId,
    rewardEntitlementId: input.rewardEntitlementId,
    fanActorRef: input.fanActorRef,
    releaseId: input.releaseId,
    units: chain.amount,
    asset: input.amount.asset,
    scale: String(input.amount.scale),
  });
  const revenueId = await client.$transaction((tx) =>
    materialize(tx, {
      redemptionId: input.redemptionId,
      rewardId: input.rewardEntitlementId,
      fanActorRef: input.fanActorRef,
      releaseId: input.releaseId,
      amount: { ...input.amount, units: BigInt(chain.amount) },
      distributionHash: chain.distributionHash,
      payloadHash,
    })
  );
  if (chain.status === "locked") return { state: "healthy" as const, revenueId };
  const locked = await trust.lockRedemption({
    redemptionId: input.redemptionId,
    revenueId,
    distributionHash: chain.distributionHash,
  });
  return { state: locked.status === "locked" ? ("locked" as const) : ("committed" as const), revenueId };
}

export async function protocolDisagreement(
  client: PrismaClient,
  trust: FanEconomyTrustExecution,
  assignmentId: string
) {
  const row = await client.rewardEntitlement.findUnique({ where: { assignmentId } });
  const protocol = await trust.getReward(assignmentId);
  if (!row || !protocol) return { disagreements: ["missing"], protocol, projection: row };
  const disagreements: string[] = [];
  if (row.authorizedUnits !== protocol.authorized) disagreements.push("authorized");
  if (row.consumedUnits !== protocol.consumed) disagreements.push("consumed");
  if (row.releasedUnits !== protocol.released) disagreements.push("released");
  const projected = remainingUnits({
    authorizedUnits: BigInt(row.authorizedUnits),
    consumedUnits: BigInt(row.consumedUnits),
    releasedUnits: BigInt(row.releasedUnits),
  });
  const authoritative =
    BigInt(protocol.authorized) - BigInt(protocol.consumed) - BigInt(protocol.released);
  if (projected !== authoritative) disagreements.push("remaining");
  return { disagreements, protocol, projection: row, authoritativeRemaining: authoritative.toString() };
}

/** Copies trust-critical counters from the protocol into Prisma. Never writes the contract. */
export async function syncRewardProjectionFromProtocol(
  client: PrismaClient,
  trust: FanEconomyTrustExecution,
  assignmentId: string
) {
  const protocol = await trust.getReward(assignmentId);
  if (!protocol) throw new FanEconomyError("TRUST_REJECTED");
  const row = await client.rewardEntitlement.findUnique({ where: { assignmentId } });
  if (!row) throw new FanEconomyError("REWARD_NOT_FOUND");
  return client.rewardEntitlement.update({
    where: { id: row.id },
    data: {
      authorizedUnits: protocol.authorized,
      consumedUnits: protocol.consumed,
      releasedUnits: protocol.released,
    },
  });
}
