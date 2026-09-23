import { NextRequest, NextResponse } from "next/server";
import { executeSettlementIntent, moneyToJson, openSettlementIntent, prepareSessionSettlement } from "@/lib/domain/economics";
import {
  getEconomicsStore,
  getExecutionStore,
  getSettlementAdapter,
} from "@/lib/domain/economics/runtime";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { configuredTrust } from "@/lib/fan-economy/trust/configured";
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
    const adapter = getSettlementAdapter();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: body.entitlementId,
      actorRef,
      occurredAt: new Date().toISOString(),
      trustRedemption: configuredTrust(),
    });
    const prepared = await prepareSessionSettlement({ actorRef: intent.actorRef, adapter });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter,
      intentRef: intent.intentRef,
      actorRef,
      destinationCapability: prepared.destinationCapability,
      executionMode: prepared.executionMode,
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
