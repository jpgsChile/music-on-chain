import { moneyEquals, type Money } from "../money";
import type { EconomicEntitlement } from "../types";
import type { ExecutionMode, ExecutionRequest, SettlementIntent } from "./types";

function looksLikeWallet(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function createSettlementIntent(input: {
  intentRef: string;
  entitlement: EconomicEntitlement;
  occurredAt?: string;
}): SettlementIntent {
  if (input.entitlement.status !== "accrued") {
    throw new Error("ENTITLEMENT_NOT_ACCRUED");
  }
  if (!input.entitlement.actorRef.trim()) {
    throw new Error("ENTITLEMENT_REQUIRES_ACTOR");
  }
  if (looksLikeWallet(input.entitlement.actorRef)) {
    throw new Error("WALLET_IS_NOT_BENEFICIARY");
  }
  return {
    intentRef: input.intentRef,
    entitlementId: input.entitlement.entitlementId,
    actorRef: input.entitlement.actorRef,
    amount: input.entitlement.amount,
    createdAt: input.occurredAt ?? "1970-01-01T00:00:00.000Z",
  };
}

export function createExecutionRequest(input: {
  requestRef: string;
  intent: SettlementIntent;
  destinationCapability?: string | null;
  executionMode: ExecutionMode;
  amount?: Money;
  occurredAt?: string;
}): ExecutionRequest {
  const amount = input.amount ?? input.intent.amount;
  if (amount.asset !== input.intent.amount.asset || amount.scale !== input.intent.amount.scale) {
    throw new Error("ASSET_MISMATCH");
  }
  if (amount.units > input.intent.amount.units) {
    throw new Error("AMOUNT_EXCEEDS_INTENT");
  }
  const destination = input.destinationCapability?.trim()
    ? input.destinationCapability.trim().toLowerCase()
    : null;
  if (destination && !looksLikeWallet(destination)) {
    throw new Error("INVALID_DESTINATION_WALLET");
  }
  return {
    requestRef: input.requestRef,
    intentRef: input.intent.intentRef,
    beneficiaryActorRef: input.intent.actorRef,
    destinationCapability: destination,
    amount,
    executionMode: input.executionMode,
    createdAt: input.occurredAt ?? "1970-01-01T00:00:00.000Z",
  };
}

export function intentMatchesEntitlement(
  intent: SettlementIntent,
  entitlement: EconomicEntitlement
): boolean {
  return (
    intent.entitlementId === entitlement.entitlementId &&
    intent.actorRef === entitlement.actorRef &&
    moneyEquals(intent.amount, entitlement.amount)
  );
}

export function requestDerivesFromIntent(
  request: ExecutionRequest,
  intent: SettlementIntent
): boolean {
  return (
    request.intentRef === intent.intentRef &&
    request.beneficiaryActorRef === intent.actorRef
  );
}

export function destinationIsNotBeneficiary(
  request: ExecutionRequest
): boolean {
  return request.beneficiaryActorRef !== request.destinationCapability;
}
