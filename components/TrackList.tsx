"use client";

import { useMemo } from "react";
import type { Artist } from "@/data/artists";
import TrackPlayer from "@/components/TrackPlayer";
import { getExtraTracks } from "@/lib/artistTracksStorage";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

interface TrackListProps {
  artist: Artist;
  /** Optional wallet override (e.g. from server for cleaver env). */
  artistWalletOverride?: string;
}

export default function TrackList({
  artist,
  artistWalletOverride,
}: TrackListProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const tracks = useMemo(
    () => [...artist.tracks, ...getExtraTracks(artist.slug)],
    [artist.tracks, artist.slug]
  );
  if (tracks.length === 0) {
    return (
      <p className="text-foreground/50 text-sm">{t.artistPage.noTracks}</p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t.artistPage.tracks}</h2>
      <ul className="space-y-4">
        {tracks.map((track) => (
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
