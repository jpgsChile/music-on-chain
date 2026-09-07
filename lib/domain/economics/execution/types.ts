import type { ActorRef } from "../../types";
import type { Money } from "../money";

export type ExecutionMode = "off-chain" | "on-chain";

export type ExecutionLifecycle =
  | "pending"
  | "accepted"
  | "submitted"
  | "confirmed"
  | "failed"
  | "unknown";

export type ExecutionOutcome = "ACCEPTED" | "SUBMITTED" | "CONFIRMED" | "FAILED" | "UNKNOWN";

/** Domain intent to fulfill an Entitlement. Not a blockchain transaction. */
export type SettlementIntent = {
  intentRef: string;
  entitlementId: string;
  actorRef: ActorRef;
  amount: Money;
  createdAt: string;
};

/** Request derived from an intent. Destination is a wallet capability, never the beneficiary. */
export type ExecutionRequest = {
  requestRef: string;
  intentRef: string;
  beneficiaryActorRef: ActorRef;
  destinationCapability: string | null;
  amount: Money;
  executionMode: ExecutionMode;
  createdAt: string;
};

export type ExecutionResult = {
  status: ExecutionOutcome;
  requestRef: string;
  intentRef: string;
  occurredAt: string;
  /** External evidence only. Not SettlementRef, EntitlementRef, or ActorRef. */
  externalRef?: string;
  metadata?: Record<string, unknown>;
};

export type SettlementReceipt = {
  receiptRef: string;
  intentRef: string;
  requestRef: string;
  executionMode: ExecutionMode;
  status: ExecutionOutcome;
  externalRef?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type SettlementReconcileInput = {
  request: ExecutionRequest;
  previous: SettlementReceipt;
};

export type SettlementExecutionAdapter = {
  execute(request: ExecutionRequest): ExecutionResult | Promise<ExecutionResult>;
  /** Optional. Used when a previous attempt is SUBMITTED or UNKNOWN. Mock adapters omit this. */
  reconcile?(input: SettlementReconcileInput): ExecutionResult | Promise<ExecutionResult>;
};
