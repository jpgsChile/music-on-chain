import { NextRequest, NextResponse } from "next/server";
import { moneyToJson } from "@/lib/domain/economics";
import { getExecutionStore } from "@/lib/domain/economics/runtime";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const { id } = await params;
  const execution = getExecutionStore();
  const intent = await execution.getIntent(id);
  if (!intent) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (intent.actorRef !== session.actorRef) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const latest = await execution.latestReceipt(intent.intentRef);
  return NextResponse.json({
    ok: true,
    value: {
      intent: { ...intent, amount: moneyToJson(intent.amount) },
      lifecycle: await execution.lifecycle(intent.intentRef),
      receipt: latest,
      entitlementId: intent.entitlementId,
    },
  });
}
