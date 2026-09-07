export { money, moneyZero, addMoney, subtractMoney, moneyToJson, moneyFromJson, moneyEquals } from "./money";
export type { AssetCode, Money, MoneyJson } from "./money";

export {
  BPS_DENOMINATOR,
  MOC_PRODUCT_FEE_POLICY_V1,
  assertFeePolicy,
  creatorShareBps,
} from "./policy";
export type { FeeKind, ProtocolFeePolicy } from "./policy";

export { allocateByBps } from "./rounding";

export {
  applyDistributionRule,
  assessFees,
  createDomainRight,
  derivedBalance,
  recordRevenue,
  reverseEntitlement,
  settleEntitlementOnce,
} from "./engine";

export {
  createMemoryEconomicsStore,
  recordRevenueOnce,
  settleOnce,
} from "./store";
export type { EconomicsStore } from "./store";

export type {
  AssessedRevenue,
  Distribution,
  DistributionRule,
  DistributionShare,
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
