import { NextRequest, NextResponse } from "next/server";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { issueParticipationInvite } from "@/lib/domain/participation/invite";

export async function POST(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const body = await request.json().catch(() => null);
  const participationId = typeof body?.participationId === "string" ? body.participationId.trim() : "";
  if (!participationId) {
    return NextResponse.json({ ok: false, error: "PARTICIPATION_REQUIRED" }, { status: 400 });
  }
  try {
    const { token } = await issueParticipationInvite({
      participationId,
      ownerActorRef: session.actorRef,
    });
    return NextResponse.json({
      ok: true,
      value: {
        path: `/dashboard/join?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVITE_FAILED";
    const status =
      message === "FORBIDDEN" ? 403 : message === "PARTICIPATION_NOT_FOUND" ? 404 : message === "ALREADY_BOUND" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
