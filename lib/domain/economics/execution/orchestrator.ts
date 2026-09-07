import type { ActorRef } from "../../types";
import type { Money } from "../money";
import { settleEntitlementOnce } from "../engine";
import type { EconomicsStore } from "../store";
import type { EconomicEntitlement, PaymentRecord, SettlementRecord } from "../types";
import {
  createExecutionRequest,
  createSettlementIntent,
  intentMatchesEntitlement,
  requestDerivesFromIntent,
} from "./intent";
import type { ExecutionStore } from "./store";
import { assertTransition, outcomeToLifecycle } from "./transitions";
import type {
  ExecutionLifecycle,
  ExecutionMode,
  ExecutionRequest,
  SettlementExecutionAdapter,
  SettlementIntent,
  SettlementReceipt,
} from "./types";

export type ExecuteSettlementResult = {
  intent: SettlementIntent;
  request: ExecutionRequest;
  receipt: SettlementReceipt;
  entitlement: EconomicEntitlement;
  settlement?: SettlementRecord;
  payment?: PaymentRecord;
};

export function openSettlementIntent(
  economics: EconomicsStore,
  execution: ExecutionStore,
  input: {
    entitlementId: string;
    actorRef: ActorRef;
    intentRef?: string;
    occurredAt?: string;
  }
): SettlementIntent {
  const entitlement = economics.getEntitlement(input.entitlementId);
  if (!entitlement) throw new Error("ENTITLEMENT_NOT_FOUND");
  if (entitlement.actorRef !== input.actorRef) throw new Error("NOT_BENEFICIARY");

  const existing = execution.getIntentByEntitlement(entitlement.entitlementId);
  if (existing) return existing;

  const intent = createSettlementIntent({
    intentRef: input.intentRef ?? `intent:${entitlement.entitlementId}`,
    entitlement,
    occurredAt: input.occurredAt,
  });
  execution.putIntent(intent);
  return intent;
}

export function applyExecutionReceipt(input: {
  economics: EconomicsStore;
  execution: ExecutionStore;
  intent: SettlementIntent;
  request: ExecutionRequest;
  entitlement: EconomicEntitlement;
  receipt: SettlementReceipt;
  previousLifecycle?: ExecutionLifecycle;
  settlementId?: string;
  occurredAt?: string;
}): ExecuteSettlementResult {
  const receipt = input.receipt;
  if (receipt.intentRef !== input.intent.intentRef) {
    throw new Error("RECEIPT_INTENT_MISMATCH");
  }
  if (receipt.requestRef !== input.request.requestRef) {
    throw new Error("RECEIPT_REQUEST_MISMATCH");
  }
  if (!intentMatchesEntitlement(input.intent, input.entitlement)) {
    throw new Error("INTENT_ENTITLEMENT_MISMATCH");
  }
  if (!requestDerivesFromIntent(input.request, input.intent)) {
    throw new Error("REQUEST_INTENT_MISMATCH");
  }

  const from = input.previousLifecycle ?? input.execution.lifecycle(input.intent.intentRef);
  const to = outcomeToLifecycle(receipt.status);
  assertTransition(from, to);
  input.execution.putReceipt(receipt);

  if (receipt.status !== "CONFIRMED") {
    return {
      intent: input.intent,
      request: input.request,
      receipt,
      entitlement: input.entitlement,
    };
  }

  if (input.economics.hasSettlementFor(input.entitlement.entitlementId)) {
    throw new Error("ENTITLEMENT_ALREADY_SETTLED");
  }

  const completed = settleEntitlementOnce(
    input.entitlement,
    input.settlementId ?? `set:${input.intent.intentRef}`,
    input.request.executionMode === "on-chain" ? "on-chain" : "off-chain",
    input.request.destinationCapability,
    input.occurredAt ?? receipt.occurredAt
  );
  input.economics.putEntitlement(completed.entitlement);
  input.economics.putSettlement(completed.settlement, completed.payment);
  return {
    intent: input.intent,
    request: input.request,
    receipt,
    entitlement: completed.entitlement,
    settlement: completed.settlement,
    payment: completed.payment,
  };
}

export function executeSettlementIntent(input: {
  economics: EconomicsStore;
  execution: ExecutionStore;
  adapter: SettlementExecutionAdapter;
  intentRef: string;
  actorRef: ActorRef;
  destinationCapability?: string | null;
  executionMode?: ExecutionMode;
  amount?: Money;
  requestRef?: string;
  settlementId?: string;
  occurredAt?: string;
}): ExecuteSettlementResult {
  const intent = input.execution.getIntent(input.intentRef);
  if (!intent) throw new Error("INTENT_NOT_FOUND");
  if (intent.actorRef !== input.actorRef) throw new Error("NOT_BENEFICIARY");

  const entitlement = input.economics.getEntitlement(intent.entitlementId);
  if (!entitlement) throw new Error("ENTITLEMENT_NOT_FOUND");

  const lifecycle = input.execution.lifecycle(intent.intentRef);
  const latestReceipt = input.execution.latestReceipt(intent.intentRef);
  const latestRequestList = input.execution.listRequests(intent.intentRef);
  const latestRequest = latestRequestList[latestRequestList.length - 1];

  if (lifecycle === "confirmed" && latestReceipt && latestRequest) {
    return {
      intent,
      request: latestRequest,
      receipt: latestReceipt,
      entitlement,
    };
  }

  if (lifecycle === "submitted" && latestReceipt && latestRequest) {
    return {
      intent,
      request: latestRequest,
      receipt: latestReceipt,
      entitlement,
    };
  }

  const request = createExecutionRequest({
    requestRef: input.requestRef ?? `req:${intent.intentRef}:${input.execution.listRequests(intent.intentRef).length}`,
    intent,
    destinationCapability: input.destinationCapability,
    executionMode: input.executionMode ?? "off-chain",
    amount: input.amount,
    occurredAt: input.occurredAt,
  });
  input.execution.putRequest(request);

  const result = input.adapter.execute(request);
  if (result.intentRef !== intent.intentRef || result.requestRef !== request.requestRef) {
    throw new Error("ADAPTER_RESULT_MISMATCH");
  }

  const receipt: SettlementReceipt = {
    receiptRef: `rcpt:${request.requestRef}`,
    intentRef: intent.intentRef,
    requestRef: request.requestRef,
    executionMode: request.executionMode,
    status: result.status,
    externalRef: result.externalRef,
    occurredAt: result.occurredAt,
    metadata: result.metadata,
  };

  return applyExecutionReceipt({
    economics: input.economics,
    execution: input.execution,
    intent,
    request,
    entitlement,
    receipt,
    previousLifecycle: lifecycle,
    settlementId: input.settlementId,
    occurredAt: input.occurredAt,
  });
}

export function rejectForeignReceipt(input: {
  intent: SettlementIntent;
  receipt: SettlementReceipt;
}): void {
  if (input.receipt.intentRef !== input.intent.intentRef) {
    throw new Error("RECEIPT_INTENT_MISMATCH");
  }
}
