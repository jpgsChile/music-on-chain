import { NextRequest, NextResponse } from "next/server";
import { listReleasesByActor, persistMusicRelease } from "@/lib/domain/releaseRepository";
import type { PricingModel, ReleaseCollaborator, ReleaseType } from "@/types/upload";

const ACTOR_HEADER = "x-actor-ref";

export async function GET(request: NextRequest) {
  const actorRef =
    request.headers.get(ACTOR_HEADER)?.trim() ||
    request.nextUrl.searchParams.get("actorRef")?.trim() ||
    "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }
  try {
    const releases = await listReleasesByActor(actorRef);
    return NextResponse.json({ ok: true, value: releases });
  } catch (e) {
    console.error("[GET /api/releases]", e);
    return NextResponse.json({ error: "Failed to list releases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actorRef = request.headers.get(ACTOR_HEADER)?.trim() || "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const created = await persistMusicRelease({
      actorRef,
      title: String(body.title ?? "").trim(),
      releaseType: body.releaseType as ReleaseType,
      language: String(body.language ?? ""),
      primaryGenre: String(body.primaryGenre ?? ""),
      secondaryGenre: String(body.secondaryGenre ?? ""),
      description: String(body.description ?? ""),
      coverUrl: body.coverUrl ?? null,
      soloCreator: Boolean(body.soloCreator),
      primaryDisplayName: typeof body.primaryDisplayName === "string" ? body.primaryDisplayName : undefined,
      collaborators: Array.isArray(body.collaborators)
        ? (body.collaborators as ReleaseCollaborator[])
        : [],
      pricingModels: Array.isArray(body.pricingModels)
        ? (body.pricingModels as PricingModel[])
        : [],
      priceUsdc: Number(body.priceUsdc) || 0,
      tokenId: body.tokenId ?? null,
      tracks: Array.isArray(body.tracks) ? body.tracks : [],
    });
    return NextResponse.json({ ok: true, value: created });
  } catch (e) {
    console.error("[POST /api/releases]", e);
    return NextResponse.json({ error: "Failed to persist release" }, { status: 500 });
  }
}
