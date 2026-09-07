import { NextRequest, NextResponse } from "next/server";
import { moneyToJson, openSettlementIntent } from "@/lib/domain/economics";
import { getEconomicsStore, getExecutionStore } from "@/lib/domain/economics/runtime";

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
    const intent = openSettlementIntent(getEconomicsStore(), getExecutionStore(), {
      entitlementId: body.entitlementId,
      actorRef,
      intentRef: typeof body.intentRef === "string" ? body.intentRef : undefined,
      occurredAt: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true,
      value: {
        ...intent,
        amount: moneyToJson(intent.amount),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTENT_FAILED";
    const status = message === "NOT_BENEFICIARY" ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const actorRef = request.headers.get("x-actor-ref")?.trim() || "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }
  const execution = getExecutionStore();
  const economics = getEconomicsStore();
  const intents = economics.listEntitlements(actorRef).flatMap((row) => {
    const intent = execution.getIntentByEntitlement(row.entitlementId);
    if (!intent) return [];
    return [{
      ...intent,
      amount: moneyToJson(intent.amount),
      lifecycle: execution.lifecycle(intent.intentRef),
    }];
  });
  return NextResponse.json({ ok: true, value: intents });
}
