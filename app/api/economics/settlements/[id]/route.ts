import { NextRequest, NextResponse } from "next/server";
import { moneyToJson } from "@/lib/domain/economics";
import { getExecutionStore } from "@/lib/domain/economics/runtime";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actorRef = request.headers.get("x-actor-ref")?.trim() || "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }
  const { id } = await params;
  const execution = getExecutionStore();
  const intent = execution.getIntent(id);
  if (!intent) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (intent.actorRef !== actorRef) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const latest = execution.latestReceipt(intent.intentRef);
  return NextResponse.json({
    ok: true,
    value: {
      intent: { ...intent, amount: moneyToJson(intent.amount) },
      lifecycle: execution.lifecycle(intent.intentRef),
      receipt: latest,
      entitlementId: intent.entitlementId,
    },
  });
}
