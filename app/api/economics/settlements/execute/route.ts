import { NextRequest, NextResponse } from "next/server";
import { executeSettlementIntent, moneyToJson } from "@/lib/domain/economics";
import {
  getEconomicsStore,
  getExecutionStore,
  getSettlementAdapter,
} from "@/lib/domain/economics/runtime";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { logDomainEvent } from "@/lib/observability/domainLog";

export async function POST(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.intentRef !== "string") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await executeSettlementIntent({
      economics: getEconomicsStore(),
      execution: getExecutionStore(),
      adapter: getSettlementAdapter(),
      intentRef: body.intentRef,
      actorRef,
      destinationCapability:
        typeof body.destinationCapability === "string" ? body.destinationCapability : null,
      executionMode: body.executionMode === "on-chain" ? "on-chain" : "off-chain",
      occurredAt: new Date().toISOString(),
    });
    logDomainEvent("economics.execute", {
      actorRef,
      intentRef: result.intent.intentRef,
      executionStatus: result.receipt.status,
      simulated: result.receipt.metadata?.adapter === "mock",
    });
    return NextResponse.json({
      ok: true,
      value: {
        intentRef: result.intent.intentRef,
        requestRef: result.request.requestRef,
        receipt: result.receipt,
        lifecycle: result.receipt.status,
        simulated: result.receipt.metadata?.adapter === "mock",
        entitlement: {
          ...result.entitlement,
          amount: moneyToJson(result.entitlement.amount),
        },
        settlement: result.settlement
          ? { ...result.settlement, amount: moneyToJson(result.settlement.amount) }
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "EXECUTE_FAILED";
    const status = message === "NOT_BENEFICIARY" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
