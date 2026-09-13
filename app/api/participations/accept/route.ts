import { NextRequest, NextResponse } from "next/server";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { acceptParticipationInvite } from "@/lib/domain/participation/invite";

export async function POST(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  try {
    const value = await acceptParticipationInvite({ token, actorRef: session.actorRef });
    return NextResponse.json({ ok: true, value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ACCEPT_FAILED";
    const status =
      message === "OWNER_CANNOT_ACCEPT_COLLABORATOR_INVITE" || message === "FORBIDDEN"
        ? 403
        : message === "ALREADY_BOUND"
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
