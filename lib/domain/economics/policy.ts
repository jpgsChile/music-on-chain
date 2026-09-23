/**
 * Product / economic policy. Versionable. Not an immutable kernel constant.
 * White Paper 95/5 + separate convenience fee lives here as product policy v1,
 * not as a property of Revenue.
 */

export type FeeKind = "protocol" | "convenience" | "other";

export type ProtocolFeePolicy = {
  policyId: string;
  version: number;
  /** Basis points of gross, withheld from the creator pool. */
  protocolFeeBps: number;
  /** Basis points of gross, charged to the buyer. Not taken from net distributable. */
  convenienceFeeBps: number;
};

export const BPS_DENOMINATOR = 10_000;

/** Product policy v1 — creator-first economics from the White Paper. */
export const MOC_PRODUCT_FEE_POLICY_V1: ProtocolFeePolicy = {
  policyId: "moc-product-fee-v1",
  version: 1,
  protocolFeeBps: 500,
  convenienceFeeBps: 0,
};

/** Redemption MVP. Partitions nothing. Does not replace the sale policy. */
export const MOC_REDEMPTION_FEE_POLICY_V1: ProtocolFeePolicy = {
  policyId: "moc-redemption-fee-v1",
  version: 1,
  protocolFeeBps: 0,
  convenienceFeeBps: 0,
};

export function creatorShareBps(policy: ProtocolFeePolicy): number {
  return BPS_DENOMINATOR - policy.protocolFeeBps;
}

export function assertFeePolicy(policy: ProtocolFeePolicy): void {
  if (!policy.policyId.trim()) throw new Error("INVALID_FEE_POLICY");
  if (!Number.isInteger(policy.version) || policy.version < 1) {
    throw new Error("INVALID_FEE_POLICY");
  }
  if (!isValidBps(policy.protocolFeeBps) || !isValidBps(policy.convenienceFeeBps)) {
    throw new Error("INVALID_FEE_BPS");
  }
}

export function isValidBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= BPS_DENOMINATOR;
}
