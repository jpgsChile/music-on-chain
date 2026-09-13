import { NextRequest, NextResponse } from "next/server";
import { listParticipationsByActor } from "@/lib/domain/releaseRepository";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";

export async function GET(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const requested = request.nextUrl.searchParams.get("actorRef")?.trim();
  if (requested && requested !== session.actorRef) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  try {
    const participations = await listParticipationsByActor(session.actorRef);
    return NextResponse.json({ ok: true, value: participations });
  } catch (e) {
    console.error("[GET /api/participations]", e);
    return NextResponse.json({ error: "Failed to list participations" }, { status: 500 });
  }
}
