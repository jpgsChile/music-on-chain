import { NextRequest, NextResponse } from "next/server";
import { moneyToJson, openSettlementIntent } from "@/lib/domain/economics";
import { getEconomicsStore, getExecutionStore } from "@/lib/domain/economics/runtime";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { configuredTrust } from "@/lib/fan-economy/trust/configured";
import { logDomainEvent } from "@/lib/observability/domainLog";

export async function POST(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.entitlementId !== "string") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const intent = await openSettlementIntent(getEconomicsStore(), getExecutionStore(), {
      entitlementId: body.entitlementId,
      actorRef,
      intentRef: typeof body.intentRef === "string" ? body.intentRef : undefined,
      occurredAt: new Date().toISOString(),
      trustRedemption: configuredTrust(),
    });
    logDomainEvent("economics.intent", {
      actorRef,
      intentRef: intent.intentRef,
      entitlementId: intent.entitlementId,
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
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;
  const execution = getExecutionStore();
  const economics = getEconomicsStore();
  const entitlements = await economics.listEntitlements(actorRef);
  const intents = [];
  for (const row of entitlements) {
    const intent = await execution.getIntentByEntitlement(row.entitlementId);
    if (!intent) continue;
    intents.push({
      ...intent,
      amount: moneyToJson(intent.amount),
      lifecycle: await execution.lifecycle(intent.intentRef),
    });
  }
  return NextResponse.json({ ok: true, value: intents });
}
