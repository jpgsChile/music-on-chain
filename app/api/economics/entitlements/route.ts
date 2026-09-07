import { NextRequest, NextResponse } from "next/server";
import { moneyToJson } from "@/lib/domain/economics";
import { getEconomicsStore } from "@/lib/domain/economics/runtime";

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
  const entitlements = getEconomicsStore()
    .listEntitlements(actorRef)
    .map((row) => ({ ...row, amount: moneyToJson(row.amount) }));
  return NextResponse.json({ ok: true, value: entitlements });
}
