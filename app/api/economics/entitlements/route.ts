import { NextRequest, NextResponse } from "next/server";
import { moneyToJson } from "@/lib/domain/economics";
import { getEconomicsStore, getExecutionStore } from "@/lib/domain/economics/runtime";

export async function GET(request: NextRequest) {
  const actorRef =
    request.headers.get("x-actor-ref")?.trim() ||
    request.nextUrl.searchParams.get("actorRef")?.trim() ||
    "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }
  const headerActor = request.headers.get("x-actor-ref")?.trim();
  if (headerActor && headerActor !== actorRef) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const execution = getExecutionStore();
  const entitlements = getEconomicsStore()
    .listEntitlements(actorRef)
    .map((row) => {
      const intent = execution.getIntentByEntitlement(row.entitlementId);
      return {
        ...row,
        amount: moneyToJson(row.amount),
        execution: intent
          ? {
              intentRef: intent.intentRef,
              lifecycle: execution.lifecycle(intent.intentRef),
              receipt: execution.latestReceipt(intent.intentRef),
            }
          : null,
      };
    });
  return NextResponse.json({ ok: true, value: entitlements });
}
