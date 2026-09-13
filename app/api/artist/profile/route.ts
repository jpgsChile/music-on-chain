import { NextRequest, NextResponse } from "next/server";
import {
  getProfileByActorRef,
  getProfileByWallet,
  upsertProfile,
} from "@/lib/artist-profile/repository";
import {
  validateRoyaltySplits,
  type ArtistProfilePayload,
} from "@/lib/artist-profile/types";
import { attachWalletToActor } from "@/lib/domain/actorWallet";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";

const WALLET_HEADER = "x-artist-wallet";

export async function GET(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const wallet = request.headers.get(WALLET_HEADER)?.trim();

  try {
    const profile =
      (await getProfileByActorRef(session.actorRef)) ??
      (wallet ? await getProfileByWallet(wallet) : null);
    return NextResponse.json(profile ?? null);
  } catch (e) {
    console.error("[GET /api/artist/profile]", e);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;
  const wallet = request.headers.get(WALLET_HEADER)?.trim() || null;

  let body: ArtistProfilePayload;
  try {
    body = (await request.json()) as ArtistProfilePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (body.defaultRoyaltySplits !== undefined && body.defaultRoyaltySplits.length) {
    const { valid, error } = validateRoyaltySplits(body.defaultRoyaltySplits);
    if (!valid) {
      return NextResponse.json({ error: error ?? "Invalid royalty splits" }, { status: 400 });
    }
  }

  if (body.username != null && body.username.trim()) {
    const cleaned = body.username.trim().replace(/^@+/, "");
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(cleaned)) {
      return NextResponse.json(
        { error: "Invalid username" },
        { status: 400 }
      );
    }
  }

  try {
    if (wallet) {
      await attachWalletToActor(actorRef, wallet);
    }
    const profile = await upsertProfile(wallet, body, actorRef);
    return NextResponse.json(profile);
  } catch (e) {
    if (e instanceof Error && e.message === "PROFILE_OWNED") {
      return NextResponse.json({ error: "PROFILE_OWNED" }, { status: 409 });
    }
    console.error("[PUT /api/artist/profile]", e);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
