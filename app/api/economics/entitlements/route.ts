import { NextRequest, NextResponse } from "next/server";
import { moneyToJson } from "@/lib/domain/economics";
import { getEconomicsStore, getExecutionStore } from "@/lib/domain/economics/runtime";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";

export async function GET(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;
  const requested =
    request.nextUrl.searchParams.get("actorRef")?.trim() ||
    request.headers.get("x-actor-ref")?.trim() ||
    actorRef;
  if (requested !== actorRef) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const execution = getExecutionStore();
  const economics = getEconomicsStore();
  const entitlements = await economics.listEntitlements(actorRef);
  const value = await Promise.all(
    entitlements.map(async (row) => {
      const intent = await execution.getIntentByEntitlement(row.entitlementId);
      const origin = await economics.getRevenue(row.revenueId);
      return {
        ...row,
        amount: moneyToJson(row.amount),
        workId: origin?.revenue.workId ?? null,
        releaseId: origin?.revenue.releaseId ?? null,
        execution: intent
          ? {
              intentRef: intent.intentRef,
              lifecycle: await execution.lifecycle(intent.intentRef),
              receipt: await execution.latestReceipt(intent.intentRef),
            }
          : null,
      };
    })
  );
  return NextResponse.json({ ok: true, value });
}
