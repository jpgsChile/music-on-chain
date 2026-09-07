import { NextRequest, NextResponse } from "next/server";
import { listParticipationsByActor } from "@/lib/domain/releaseRepository";

export async function GET(request: NextRequest) {
  const actorRef =
    request.headers.get("x-actor-ref")?.trim() ||
    request.nextUrl.searchParams.get("actorRef")?.trim() ||
    "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }
  try {
    const participations = await listParticipationsByActor(actorRef);
    return NextResponse.json({ ok: true, value: participations });
  } catch (e) {
    console.error("[GET /api/participations]", e);
    return NextResponse.json({ error: "Failed to list participations" }, { status: 500 });
  }
}
