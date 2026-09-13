import { NextRequest, NextResponse } from "next/server";
import { executeSettlementIntent, moneyToJson, openSettlementIntent } from "@/lib/domain/economics";
import {
  getEconomicsStore,
  getExecutionStore,
  getSettlementAdapter,
} from "@/lib/domain/economics/runtime";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { logDomainEvent } from "@/lib/observability/domainLog";

/**
 * Request settlement. The client cannot declare SETTLED.
 * Confirmation comes from the execution adapter.
 */
export async function POST(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.entitlementId !== "string") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const economics = getEconomicsStore();
    const execution = getExecutionStore();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: body.entitlementId,
      actorRef,
      occurredAt: new Date().toISOString(),
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: getSettlementAdapter(),
      intentRef: intent.intentRef,
      actorRef,
      destinationCapability:
        typeof body.destinationCapability === "string" ? body.destinationCapability : null,
      executionMode: body.executionMode === "on-chain" ? "on-chain" : "off-chain",
      occurredAt: new Date().toISOString(),
    });
    logDomainEvent("economics.settlement", {
      actorRef,
      intentRef: result.intent.intentRef,
      entitlementId: result.entitlement.entitlementId,
      executionStatus: result.receipt.status,
      settlementStatus: result.settlement?.status ?? "none",
      simulated: result.receipt.metadata?.adapter === "mock",
    });
    return NextResponse.json({
      ok: true,
      value: {
        intentRef: result.intent.intentRef,
        lifecycle: result.receipt.status,
        simulated: result.receipt.metadata?.adapter === "mock",
        entitlement: {
          ...result.entitlement,
          amount: moneyToJson(result.entitlement.amount),
        },
        settlement: result.settlement
          ? { ...result.settlement, amount: moneyToJson(result.settlement.amount) }
          : null,
        receipt: result.receipt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SETTLEMENT_FAILED";
    const status = message === "NOT_BENEFICIARY" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
