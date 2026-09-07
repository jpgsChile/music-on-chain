import { NextRequest, NextResponse } from "next/server";
import { executeSettlementIntent, moneyToJson, openSettlementIntent } from "@/lib/domain/economics";
import {
  getEconomicsStore,
  getExecutionStore,
  getSettlementAdapter,
} from "@/lib/domain/economics/runtime";

/**
 * Request settlement. The client cannot declare SETTLED.
 * Confirmation comes from the execution adapter.
 */
export async function POST(request: NextRequest) {
  const actorRef = request.headers.get("x-actor-ref")?.trim() || "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.entitlementId !== "string") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const economics = getEconomicsStore();
    const execution = getExecutionStore();
    const intent = openSettlementIntent(economics, execution, {
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
    return NextResponse.json({
      ok: true,
      value: {
        intentRef: result.intent.intentRef,
        lifecycle: result.receipt.status,
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
