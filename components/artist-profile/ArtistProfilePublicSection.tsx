"use client";

import { useArtistProfilePublic } from "@/lib/artist-profile/useArtistProfile";
import ArtistProfileView from "./ArtistProfileView";

interface ArtistProfilePublicSectionProps {
  artistWallet: string;
}

/**
 * Public profile block for artist pages (Fan view).
 * Fetches profile by wallet and renders read-only view.
 */
export default function ArtistProfilePublicSection({
  artistWallet,
}: ArtistProfilePublicSectionProps) {
  const { profile, loading } = useArtistProfilePublic(artistWallet);
  if (loading || !profile) return null;
  return (
    <section>
      <ArtistProfileView profile={profile} compact />
    </section>
  );
}
