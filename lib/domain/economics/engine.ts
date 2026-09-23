import type { ActorRef } from "../types";
import { addMoney, money, moneyZero, subtractMoney, type Money } from "./money";
import {
  assertFeePolicy,
  BPS_DENOMINATOR,
  type ProtocolFeePolicy,
} from "./policy";
import { allocateByBps } from "./rounding";
import type {
  AssessedRevenue,
  Distribution,
  DistributionRule,
  DomainRight,
  EconomicEntitlement,
  EconomicEvent,
  FeeAssessment,
  FeeLine,
  PaymentRecord,
  Revenue,
  Sale,
  SettlementRecord,
} from "./types";

function nowIso(occurredAt?: string): string {
  return occurredAt ?? "1970-01-01T00:00:00.000Z";
}

export function assessFees(
  revenueId: string,
  gross: Money,
  policy: ProtocolFeePolicy
): FeeAssessment {
  assertFeePolicy(policy);
  const protocolUnits =
    (gross.units * BigInt(policy.protocolFeeBps)) / BigInt(BPS_DENOMINATOR);
  const convenienceUnits =
    (gross.units * BigInt(policy.convenienceFeeBps)) / BigInt(BPS_DENOMINATOR);
  const protocol: FeeLine = {
    kind: "protocol",
    amount: money(protocolUnits, gross.asset, gross.scale),
    bps: policy.protocolFeeBps,
    borneBy: "creator-pool",
  };
  const convenience: FeeLine = {
    kind: "convenience",
    amount: money(convenienceUnits, gross.asset, gross.scale),
    bps: policy.convenienceFeeBps,
    borneBy: "buyer",
  };
  const netDistributable = subtractMoney(gross, protocol.amount);
  const buyerPays = addMoney(gross, convenience.amount);
  return {
    revenueId,
    policy,
    fees: [protocol, convenience],
    netDistributable,
    buyerPays,
  };
}

export function applyDistributionRule(
  distributionId: string,
  revenueId: string,
  net: Money,
  rule: DistributionRule
): Distribution {
  if (!rule.ruleId.trim()) throw new Error("INVALID_DISTRIBUTION_RULE");
  if (rule.shares.some((share) => !share.actorRef.trim())) {
    throw new Error("SHARE_REQUIRES_ACTOR");
  }
  if (rule.shares.some((share) => looksLikeWallet(share.actorRef))) {
    throw new Error("WALLET_IS_NOT_BENEFICIARY");
  }
  const allocations = allocateByBps(net.units, rule.shares).map((row, index) => ({
    actorRef: row.actorRef,
    amount: money(row.units, net.asset, net.scale),
    bps: row.bps,
    source: rule.shares[index].source,
  }));
  const sum = allocations.reduce((acc, row) => acc + row.amount.units, BigInt(0));
  if (sum !== net.units) throw new Error("DISTRIBUTION_NOT_CONSERVATIVE");
  return {
    distributionId,
    revenueId,
    ruleId: rule.ruleId,
    allocations,
  };
}

function looksLikeWallet(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function recordRevenue(input: {
  revenueId: string;
  distributionId: string;
  gross: Money;
  policy: ProtocolFeePolicy;
  rule: DistributionRule;
  occurredAt?: string;
  sale?: Sale;
  origin?: Revenue["origin"];
  workId?: string;
  releaseId?: string;
}): AssessedRevenue {
  const occurredAt = nowIso(input.occurredAt);
  const origin = input.origin ?? {
    kind: input.sale ? "sale" : "other",
    id: input.sale?.saleId ?? input.revenueId,
  };
  const revenue: Revenue = {
    revenueId: input.revenueId,
    origin,
    saleId: input.sale?.saleId,
    workId: input.workId ?? input.sale?.workId,
    releaseId: input.releaseId ?? input.sale?.releaseId,
    gross: input.gross,
    occurredAt,
    policyId: input.policy.policyId,
    policyVersion: input.policy.version,
    status: "recorded",
  };
  const assessment = assessFees(revenue.revenueId, revenue.gross, input.policy);
  const distribution = applyDistributionRule(
    input.distributionId,
    revenue.revenueId,
    assessment.netDistributable,
    input.rule
  );
  const entitlements: EconomicEntitlement[] = distribution.allocations.map(
    (row, index) => ({
      entitlementId: `${revenue.revenueId}:ent:${index}`,
      actorRef: row.actorRef,
      revenueId: revenue.revenueId,
      distributionId: distribution.distributionId,
      amount: row.amount,
      shareBps: row.bps,
      source: row.source,
      status: "accrued",
      createdAt: occurredAt,
    })
  );
  const events: EconomicEvent[] = [
    {
      type: "RevenueRecorded",
      entityKind: "revenue",
      entityId: revenue.revenueId,
      occurredAt,
      origin: "engine",
    },
    {
      type: "FeesAssessed",
      entityKind: "revenue",
      entityId: revenue.revenueId,
      occurredAt,
      origin: "engine",
    },
    {
      type: "RevenueDistributed",
      entityKind: "distribution",
      entityId: distribution.distributionId,
      occurredAt,
      origin: "engine",
    },
    ...entitlements.map((entitlement) => ({
      type: "EntitlementAccrued",
      entityKind: "entitlement" as const,
      entityId: entitlement.entitlementId,
      actorRef: entitlement.actorRef,
      occurredAt,
      origin: "engine" as const,
    })),
  ];
  return {
    sale: input.sale,
    revenue,
    assessment,
    distribution,
    entitlements,
    events,
  };
}

export function settleEntitlementOnce(
  entitlement: EconomicEntitlement,
  settlementId: string,
  executionLayer: SettlementRecord["executionLayer"],
  destinationWallet?: string | null,
  occurredAt?: string
): { entitlement: EconomicEntitlement; settlement: SettlementRecord; payment: PaymentRecord } {
  if (entitlement.status === "settled") {
    throw new Error("ENTITLEMENT_ALREADY_SETTLED");
  }
  if (entitlement.status === "reversed") {
    throw new Error("ENTITLEMENT_REVERSED");
  }
  if (destinationWallet && looksLikeWallet(destinationWallet) === false && destinationWallet.trim()) {
    throw new Error("INVALID_DESTINATION_WALLET");
  }
  const at = nowIso(occurredAt);
  const settled: EconomicEntitlement = {
    ...entitlement,
    status: "settled",
    settledAt: at,
  };
  const settlement: SettlementRecord = {
    settlementId,
    entitlementId: entitlement.entitlementId,
    actorRef: entitlement.actorRef,
    amount: entitlement.amount,
    executionLayer,
    destinationWallet: destinationWallet?.trim().toLowerCase() || null,
    status: "completed",
    createdAt: at,
  };
  const payment: PaymentRecord = {
    paymentId: `${settlementId}:pay`,
    settlementId,
    amount: entitlement.amount,
    status: "recorded",
    createdAt: at,
  };
  return { entitlement: settled, settlement, payment };
}

export function reverseEntitlement(
  entitlement: EconomicEntitlement,
  occurredAt?: string
): EconomicEntitlement {
  if (entitlement.status === "settled") {
    throw new Error("REVERSE_AFTER_SETTLEMENT_REQUIRES_REVERSAL_RECORD");
  }
  return {
    ...entitlement,
    status: "reversed",
    settledAt: nowIso(occurredAt),
  };
}

export function createDomainRight(input: DomainRight): DomainRight {
  if (!input.actorRef.trim()) throw new Error("RIGHT_REQUIRES_ACTOR");
  if (looksLikeWallet(input.actorRef)) throw new Error("WALLET_IS_NOT_RIGHTS_HOLDER");
  if (!input.objectId.trim()) throw new Error("RIGHT_REQUIRES_OBJECT");
  return { ...input };
}

export function derivedBalance(
  entitlements: EconomicEntitlement[],
  actorRef: ActorRef
): { accrued: Money | null; settled: Money | null } {
  const mine = entitlements.filter((row) => row.actorRef === actorRef);
  if (mine.length === 0) return { accrued: null, settled: null };
  const asset = mine[0].amount;
  const accrued = mine
    .filter((row) => row.status === "accrued")
    .reduce((sum, row) => addMoney(sum, row.amount), moneyZero(asset.asset, asset.scale));
  const settled = mine
    .filter((row) => row.status === "settled")
    .reduce((sum, row) => addMoney(sum, row.amount), moneyZero(asset.asset, asset.scale));
  return { accrued, settled };
}
