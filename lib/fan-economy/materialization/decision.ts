export type PublicationState = "pending" | "submitting" | "confirmed" | "failed";

export type ChainSnapshot = {
  status: "committed" | "locked" | "reversed";
  grantId: string;
  distributionHash: string;
  materializationHash: string | null;
  amount: string;
  targetHash: string;
};

export type PublicationDecision =
  | { kind: "confirm-existing" }
  | { kind: "submit-lock" }
  | { kind: "payload-conflict" }
  | { kind: "missing-redemption" }
  | { kind: "redeem-then-lock" }
  | { kind: "inconsistent" }
  | { kind: "reconcile"; transactionHash: string }
  | { kind: "not-committed" };

function same(left: string | null | undefined, right: string): boolean {
  return (left ?? "").trim().toLowerCase() === right.trim().toLowerCase();
}

/**
 * Decides the next materialization step from canonical evidence and contract state.
 * A missing on-chain redemption never selects lock.
 */
export function decidePublication(input: {
  evidence: { state: PublicationState; transactionHash: string | null } | null;
  chain: ChainSnapshot | null;
  expectedMaterializationHash: string;
  expectedDistributionHash: string;
  expectedAmount?: string;
  expectedTargetHash?: string;
  controlledRedeem: boolean;
}): PublicationDecision {
  const lockedMatch =
    input.chain?.status === "locked" && same(input.chain.materializationHash, input.expectedMaterializationHash);
  if (input.evidence?.state === "confirmed") {
    return lockedMatch ? { kind: "confirm-existing" } : { kind: "inconsistent" };
  }
  if (input.chain?.status === "locked") {
    return lockedMatch ? { kind: "confirm-existing" } : { kind: "payload-conflict" };
  }
  if (input.evidence?.state === "submitting" && input.evidence.transactionHash) {
    return { kind: "reconcile", transactionHash: input.evidence.transactionHash };
  }
  if (input.chain?.status === "committed") {
    const distributionOk = same(input.chain.distributionHash, input.expectedDistributionHash);
    const amountOk = input.expectedAmount == null || same(input.chain.amount, input.expectedAmount);
    const targetOk = input.expectedTargetHash == null || same(input.chain.targetHash, input.expectedTargetHash);
    return distributionOk && amountOk && targetOk ? { kind: "submit-lock" } : { kind: "payload-conflict" };
  }
  if (input.chain?.status === "reversed") return { kind: "not-committed" };
  return input.controlledRedeem ? { kind: "redeem-then-lock" } : { kind: "missing-redemption" };
}
