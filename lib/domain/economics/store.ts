import type { ActorRef } from "../types";
import type { AssessedRevenue, EconomicEntitlement, PaymentRecord, SettlementRecord } from "./types";
import { recordRevenue, settleEntitlementOnce } from "./engine";
import type { ProtocolFeePolicy } from "./policy";
import type { DistributionRule, Sale } from "./types";
import type { Money } from "./money";

export type EconomicsStore = {
  hasRevenue(revenueId: string): boolean;
  putAssessed(assessed: AssessedRevenue): void;
  getRevenue(revenueId: string): AssessedRevenue | null;
  listEntitlements(actorRef: ActorRef): EconomicEntitlement[];
  getEntitlement(entitlementId: string): EconomicEntitlement | null;
  putEntitlement(entitlement: EconomicEntitlement): void;
  hasSettlementFor(entitlementId: string): boolean;
  putSettlement(settlement: SettlementRecord, payment: PaymentRecord): void;
  listRevenues(): AssessedRevenue[];
};

export function createMemoryEconomicsStore(seed?: AssessedRevenue[]): EconomicsStore {
  const revenues = new Map<string, AssessedRevenue>();
  const entitlements = new Map<string, EconomicEntitlement>();
  const settlements = new Map<string, SettlementRecord>();
  const payments = new Map<string, PaymentRecord>();

  function ingest(assessed: AssessedRevenue) {
    revenues.set(assessed.revenue.revenueId, assessed);
    for (const entitlement of assessed.entitlements) {
      entitlements.set(entitlement.entitlementId, entitlement);
    }
  }

  for (const item of seed ?? []) ingest(item);

  return {
    hasRevenue(revenueId) {
      return revenues.has(revenueId);
    },
    putAssessed(assessed) {
      ingest(assessed);
    },
    getRevenue(revenueId) {
      return revenues.get(revenueId) ?? null;
    },
    listEntitlements(actorRef) {
      return [...entitlements.values()].filter((row) => row.actorRef === actorRef);
    },
    getEntitlement(entitlementId) {
      return entitlements.get(entitlementId) ?? null;
    },
    putEntitlement(entitlement) {
      entitlements.set(entitlement.entitlementId, entitlement);
      const assessed = revenues.get(entitlement.revenueId);
      if (assessed) {
        assessed.entitlements = assessed.entitlements.map((row) =>
          row.entitlementId === entitlement.entitlementId ? entitlement : row
        );
      }
    },
    hasSettlementFor(entitlementId) {
      for (const settlement of settlements.values()) {
        if (settlement.entitlementId === entitlementId && settlement.status === "completed") {
          return true;
        }
      }
      return false;
    },
    putSettlement(settlement, payment) {
      settlements.set(settlement.settlementId, settlement);
      payments.set(payment.paymentId, payment);
    },
    listRevenues() {
      return [...revenues.values()];
    },
  };
}

export function recordRevenueOnce(
  store: EconomicsStore,
  input: {
    revenueId: string;
    distributionId: string;
    gross: Money;
    policy: ProtocolFeePolicy;
    rule: DistributionRule;
    occurredAt?: string;
    sale?: Sale;
    workId?: string;
    releaseId?: string;
  }
): AssessedRevenue {
  if (store.hasRevenue(input.revenueId)) {
    throw new Error("DUPLICATE_REVENUE");
  }
  const assessed = recordRevenue(input);
  store.putAssessed(assessed);
  return assessed;
}

export function settleOnce(
  store: EconomicsStore,
  input: {
    entitlementId: string;
    settlementId: string;
    actorRef: ActorRef;
    executionLayer?: SettlementRecord["executionLayer"];
    destinationWallet?: string | null;
    occurredAt?: string;
  }
): { entitlement: EconomicEntitlement; settlement: SettlementRecord; payment: PaymentRecord } {
  const entitlement = store.getEntitlement(input.entitlementId);
  if (!entitlement) throw new Error("ENTITLEMENT_NOT_FOUND");
  if (entitlement.actorRef !== input.actorRef) throw new Error("NOT_BENEFICIARY");
  if (store.hasSettlementFor(entitlement.entitlementId)) {
    throw new Error("ENTITLEMENT_ALREADY_SETTLED");
  }
  const result = settleEntitlementOnce(
    entitlement,
    input.settlementId,
    input.executionLayer ?? "unspecified",
    input.destinationWallet,
    input.occurredAt
  );
  store.putEntitlement(result.entitlement);
  store.putSettlement(result.settlement, result.payment);
  return result;
}
