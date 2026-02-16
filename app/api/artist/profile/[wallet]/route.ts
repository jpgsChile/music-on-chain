import { NextRequest, NextResponse } from "next/server";
import { getProfileByWallet } from "@/lib/artist-profile/repository";

/**
 * GET /api/artist/profile/[wallet]
 * Public read: returns the artist profile for the given wallet.
 * Used by artist pages and fans to display profile (name, country, roles).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  if (!wallet?.trim()) {
    return NextResponse.json(
      { error: "Wallet address required" },
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
    console.error("[GET /api/artist/profile/[wallet]]", e);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
