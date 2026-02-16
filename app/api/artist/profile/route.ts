import { NextRequest, NextResponse } from "next/server";
import { getProfileByWallet, upsertProfile } from "@/lib/artist-profile/repository";
import {
  validateRoyaltySplits,
  type ArtistProfilePayload,
} from "@/lib/artist-profile/types";

const WALLET_HEADER = "x-artist-wallet";

/**
 * GET /api/artist/profile
 * Returns the profile for the wallet in x-artist-wallet header.
 * Artist-only: caller must send their wallet (from Privy session).
 */
export async function GET(request: NextRequest) {
  const wallet = request.headers.get(WALLET_HEADER)?.trim();
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing x-artist-wallet header" },
      { status: 400 }
    );
  }

  try {
    const profile = await getProfileByWallet(wallet);
    if (!profile) {
      return NextResponse.json(null, { status: 200 });
    }
    return NextResponse.json(profile);
  } catch (e) {
    console.error("[GET /api/artist/profile]", e);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/artist/profile
 * Upserts the artist profile for the wallet in x-artist-wallet header.
 * Body: { artisticName?, country?, creativeRoles?, defaultRoyaltySplits? }
 * Artist-only: in production, verify ownership via Privy server SDK or signed message.
 */
export async function PUT(request: NextRequest) {
  const wallet = request.headers.get(WALLET_HEADER)?.trim();
  if (!wallet) {
    return NextResponse.json(
      { error: "Missing x-artist-wallet header" },
      { status: 400 }
    );
  }

  let body: ArtistProfilePayload;
  try {
    body = (await request.json()) as ArtistProfilePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (body.defaultRoyaltySplits?.length) {
    const { valid, error } = validateRoyaltySplits(body.defaultRoyaltySplits);
    if (!valid) {
      return NextResponse.json({ error: error ?? "Invalid royalty splits" }, { status: 400 });
    }
  }

  try {
    const profile = await upsertProfile(wallet, body);
    return NextResponse.json(profile);
  } catch (e) {
    console.error("[PUT /api/artist/profile]", e);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
