"use client";

import type { Artist } from "@/data/artists";
import TrackPlayer from "@/components/TrackPlayer";
import { getTranslations } from "@/lib/i18n";

interface TrackListProps {
  artist: Artist;
  /** Optional wallet override (e.g. from server for cleaver env). */
  artistWalletOverride?: string;
}

export default function TrackList({
  artist,
  artistWalletOverride,
}: TrackListProps) {
  const t = getTranslations("es");
  if (!artist.tracks.length) {
    return (
      <p className="text-foreground/50 text-sm">{t.artistPage.noTracks}</p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t.artistPage.tracks}</h2>
      <ul className="space-y-4">
        {artist.tracks.map((track) => (
          <li key={track.id}>
            <TrackPlayer
              artist={artist}
              track={track}
              artistWalletOverride={artistWalletOverride}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
