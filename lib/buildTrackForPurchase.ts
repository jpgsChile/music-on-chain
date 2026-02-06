import type { Track as LegacyTrack } from "@/types";
import type { Artist, Track } from "@/data/artists";

/**
 * Builds the legacy Track shape for PurchaseModal from data-layer Artist + Track.
 * Optionally pass artistWallet to override (e.g. from server env).
 */
export function buildTrackForPurchase(
  artist: Artist,
  track: Track,
  artistWalletOverride?: string
): LegacyTrack {
  const wallet = (artistWalletOverride?.trim() || artist.wallet) || "";
  return {
    id: track.id,
    title: track.title,
    artist: {
      id: artist.slug,
      name: artist.name,
      bio: artist.description,
      avatar: artist.logoUrl,
      walletAddress: wallet,
    },
    duration: 0,
    price: track.price,
    format: "WAV",
    previewUrl: track.audioUrl,
    splits: [
      {
        id: `${artist.slug}-artist`,
        walletAddress: wallet,
        percentage: 100,
        role: "Artist",
      },
    ],
  };
}
