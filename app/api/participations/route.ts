import { NextRequest, NextResponse } from "next/server";
import { listParticipationsByActor } from "@/lib/domain/releaseRepository";
import { participationBindingStatus } from "@/lib/domain/participation/invite";
import { getProfileByActorRef } from "@/lib/artist-profile/repository";
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
    const ownerNames = new Map<string, string | null>();
    for (const row of participations) {
      const ownerRef = row.release.actorRef;
      if (!ownerNames.has(ownerRef)) {
        const profile = await getProfileByActorRef(ownerRef);
        ownerNames.set(ownerRef, profile?.artisticName?.trim() || null);
      }
    }
    return NextResponse.json({
      ok: true,
      value: participations.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        role: row.role,
        revenueSharePercent: row.revenueSharePercent,
        actorRef: row.actorRef,
        release: {
          id: row.release.id,
          title: row.release.title,
          actorRef: row.release.actorRef,
          workId: row.release.workId,
          work: row.release.work,
          ownerDisplayName: ownerNames.get(row.release.actorRef) ?? null,
        },
        bindingStatus: participationBindingStatus({
          actorRef: row.actorRef,
          invited: Boolean(row.invite && !row.invite.acceptedAt),
        }),
        canInvite: row.release.actorRef === session.actorRef && !row.actorRef,
      })),
    });
  } catch (e) {
    console.error("[GET /api/participations]", e);
    return NextResponse.json({ error: "Failed to list participations" }, { status: 500 });
  }
}
