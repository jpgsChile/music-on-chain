"use client";

import { useState, useCallback } from "react";
import type { Artist, Track } from "@/data/artists";
import {
  getExtraTracks,
  addExtraTrack,
  removeExtraTrack,
} from "@/lib/artistTracksStorage";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import Link from "next/link";

interface ArtistTrackConfigProps {
  artist: Artist;
}

export default function ArtistTrackConfig({ artist }: ArtistTrackConfigProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const [extraTracks, setExtraTracks] = useState<Track[]>(() =>
    getExtraTracks(artist.slug)
  );
  const [title, setTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [price, setPrice] = useState("1");
  const [saving, setSaving] = useState(false);

  const refreshExtra = useCallback(() => {
    setExtraTracks(getExtraTracks(artist.slug));
  }, [artist.slug]);

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedTitle = title.trim();
      const trimmedUrl = audioUrl.trim();
      const numPrice = parseFloat(price);
      if (!trimmedTitle || !trimmedUrl || Number.isNaN(numPrice) || numPrice < 0)
        return;
      setSaving(true);
      addExtraTrack(artist.slug, {
        title: trimmedTitle,
        audioUrl: trimmedUrl,
        price: numPrice,
      });
      refreshExtra();
      setTitle("");
      setAudioUrl("");
      setPrice("1");
      setSaving(false);
    },
    [artist.slug, title, audioUrl, price, refreshExtra]
  );

  const handleRemove = useCallback(
    (trackId: string) => {
      removeExtraTrack(artist.slug, trackId);
      refreshExtra();
    },
    [artist.slug, refreshExtra]
  );

  const allTracks: Track[] = [...artist.tracks, ...extraTracks];

  return (
    <div className="border border-border rounded-lg p-6 bg-background">
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {t.dashboard.trackConfig}
      </h3>
      <p className="text-sm text-foreground/60 mb-6">
        {t.dashboard.trackConfigDesc}
      </p>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-foreground/80 mb-3">
          {t.dashboard.myTracks} ({allTracks.length})
        </h4>
        {allTracks.length === 0 ? (
          <p className="text-sm text-foreground/50">{t.dashboard.noTracksYet}</p>
        ) : (
          <ul className="space-y-2">
            {allTracks.map((track) => {
              const isExtra = extraTracks.some((e) => e.id === track.id);
              return (
                <li
                  key={track.id}
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-foreground/5 border border-border/50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground truncate block">
                      {track.title}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {track.price} USDC
                      {isExtra && " · Añadida por ti"}
                    </span>
                  </div>
                  {isExtra && (
                    <button
                      type="button"
                      onClick={() => handleRemove(track.id)}
                      className="text-xs px-2 py-1 rounded border border-border text-foreground/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                    >
                      {t.dashboard.removeTrack}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={handleAdd} className="space-y-4">
        <h4 className="text-sm font-medium text-foreground/80">
          {t.dashboard.addTrack}
        </h4>
        <div>
          <label className="block text-sm text-foreground/70 mb-1">
            {t.dashboard.trackTitle}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Mi nueva canción"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div>
          <label className="block text-sm text-foreground/70 mb-1">
            {t.dashboard.trackAudioUrl}
          </label>
          <input
            type="url"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://... o /assets/mi-tema.wav"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div>
          <label className="block text-sm text-foreground/70 mb-1">
            {t.dashboard.trackPrice}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim() || !audioUrl.trim()}
          className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.dashboard.saveTrack}
        </button>
      </form>

      <p className="mt-4 text-xs text-foreground/50">
        Tu página de artista:{" "}
        <Link
          href={`/artist/${artist.slug}`}
          className="text-accent hover:underline"
        >
          /artist/{artist.slug}
        </Link>
      </p>
    </div>
  );
}
