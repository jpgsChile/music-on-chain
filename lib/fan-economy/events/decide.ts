import { createHash } from "node:crypto";
import type { ChainSnapshot } from "@/lib/fan-economy/materialization/decision";

export type EventOutcome =
  | "MATCHED"
  | "DUPLICATE"
  | "UNKNOWN_CANONICAL_RECORD"
  | "PAYLOAD_CONFLICT"
  | "INCOMPLETE"
  | "REQUIRES_CHAIN_READ";

export type ObservedEvent = {
  pagingToken: string;
  ledger: number;
  transactionHash: string;
  contractId: string;
  eventType: string;
  canonicalHash: string | null;
  amount: string | null;
  successful: boolean;
};

export type CanonicalMaterialization = {
  redemptionId: string;
  amount: string;
  redemptionHash: string;
  materializationHash: string;
  distributionHash: string;
  targetHash: string;
};

export type EvidenceView = {
  state: string;
  materializationHash: string | null;
  transactionHash: string | null;
} | null;

export function payloadHash(event: Pick<ObservedEvent, "eventType" | "canonicalHash" | "amount">): string {
  return createHash("sha256")
    .update(`${event.eventType}|${event.canonicalHash ?? ""}|${event.amount ?? ""}`)
    .digest("hex");
}

function same(left: string | null | undefined, right: string): boolean {
  return (left ?? "").trim().toLowerCase() === right.trim().toLowerCase();
}

/**
 * RedemptionLocked carries the redemption hash and the amount.
 * The materialization commitment is read from the contract, then compared
 * with the value derived from PostgreSQL.
 */
export function decideLockedEvent(input: {
  event: ObservedEvent;
  expectedContractId: string;
  canonical: CanonicalMaterialization | null;
  chain: ChainSnapshot | null | "unread";
  evidence: EvidenceView;
  duplicate: boolean;
}): EventOutcome {
  if (input.duplicate) return "DUPLICATE";
  const event = input.event;
  if (!event.successful || !event.transactionHash || !event.ledger || event.contractId !== input.expectedContractId) {
    return "INCOMPLETE";
  }
  if (event.eventType !== "RedemptionLocked" || !event.canonicalHash || !/^[0-9a-f]{64}$/i.test(event.canonicalHash) || !event.amount) {
    return "INCOMPLETE";
  }
  if (!input.canonical) return "UNKNOWN_CANONICAL_RECORD";
  if (!same(event.canonicalHash, input.canonical.redemptionHash) || event.amount !== input.canonical.amount) {
    return "PAYLOAD_CONFLICT";
  }
  if (
    input.evidence?.state === "confirmed" &&
    input.evidence.materializationHash &&
    !same(input.evidence.materializationHash, input.canonical.materializationHash)
  ) {
    return "PAYLOAD_CONFLICT";
  }
  if (input.chain === "unread") return "REQUIRES_CHAIN_READ";
  if (!input.chain || input.chain.status !== "locked") return "INCOMPLETE";
  const chainMatches =
    input.chain.amount === input.canonical.amount &&
    same(input.chain.distributionHash, input.canonical.distributionHash) &&
    same(input.chain.targetHash, input.canonical.targetHash) &&
    same(input.chain.materializationHash, input.canonical.materializationHash);
  return chainMatches ? "MATCHED" : "PAYLOAD_CONFLICT";
}
