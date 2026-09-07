import type { ActorRef } from "../types";
import type { Money, MoneyJson } from "./money";
import type { FeeKind, ProtocolFeePolicy } from "./policy";

export type Sale = {
  saleId: string;
  occurredAt: string;
  workId?: string;
  releaseId?: string;
  trackId?: string;
};

export type RevenueOrigin = {
  kind: "sale" | "other";
  id: string;
};

export type Revenue = {
  revenueId: string;
  origin: RevenueOrigin;
  saleId?: string;
  workId?: string;
  releaseId?: string;
  gross: Money;
  occurredAt: string;
  policyId: string;
  policyVersion: number;
};

export type FeeLine = {
  kind: FeeKind;
  amount: Money;
  bps: number;
  borneBy: "buyer" | "creator-pool";
};

export type FeeAssessment = {
  revenueId: string;
  policy: ProtocolFeePolicy;
  fees: FeeLine[];
  netDistributable: Money;
  buyerPays: Money;
};

export type DistributionShare = {
  actorRef: ActorRef;
  bps: number;
  source: {
    kind: "participation" | "right" | "rule";
    id?: string;
  };
};

export type DistributionRule = {
  ruleId: string;
  shares: DistributionShare[];
};

export type Distribution = {
  distributionId: string;
  revenueId: string;
  ruleId: string;
  allocations: {
    actorRef: ActorRef;
    amount: Money;
    bps: number;
    source: DistributionShare["source"];
  }[];
};

export type RightObjectKind = "work" | "release" | "track" | "revenue-stream";

export type DomainRight = {
  rightId: string;
  actorRef: ActorRef;
  objectKind: RightObjectKind;
  objectId: string;
  kind: string;
};

export type EconomicEntitlementStatus = "accrued" | "settled" | "reversed";

export type EconomicEntitlement = {
  entitlementId: string;
  actorRef: ActorRef;
  revenueId: string;
  distributionId: string;
  amount: Money;
  shareBps: number;
  source: DistributionShare["source"];
  status: EconomicEntitlementStatus;
  createdAt: string;
  settledAt?: string;
};

export type SettlementStatus = "completed" | "reversed";

export type SettlementRecord = {
  settlementId: string;
  entitlementId: string;
  actorRef: ActorRef;
  amount: Money;
  executionLayer: "unspecified" | "off-chain" | "on-chain";
  destinationWallet?: string | null;
  status: SettlementStatus;
  createdAt: string;
};

export type PaymentRecord = {
  paymentId: string;
  settlementId: string;
  amount: Money;
  status: "recorded";
  createdAt: string;
};

export type EconomicEvent = {
  type: string;
  entityKind: "sale" | "revenue" | "distribution" | "entitlement" | "settlement" | "payment" | "right";
  entityId: string;
  actorRef?: ActorRef;
  occurredAt: string;
  origin: "engine" | "api" | "system";
};

export type AssessedRevenue = {
  sale?: Sale;
  revenue: Revenue;
  assessment: FeeAssessment;
  distribution: Distribution;
  entitlements: EconomicEntitlement[];
  events: EconomicEvent[];
};

export type MoneyWire = MoneyJson;
