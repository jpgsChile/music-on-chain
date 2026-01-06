"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import { getArtistById, getTracksByArtist } from "@/data/mock";
import TrackCard from "@/components/TrackCard";
import { formatAddress } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import Link from "next/link";
import { useMemo } from "react";

interface ArtistDetailPageProps {
  params: {
    id: string;
  };
}

export default function ArtistDetailPage({ params }: ArtistDetailPageProps) {
  const t = getTranslations("es");
  const artist = useMemo(() => getArtistById(params.id), [params.id]);
  const tracks = useMemo(
    () => (artist ? getTracksByArtist(artist.id) : []),
    [artist]
  );

  if (!artist) {
    notFound();
  }

  const handlePurchase = (trackId: string, sale: import("@/types").Sale) => {
    // Mock purchase handler - sale is already saved in mock state
    console.log(`Purchase completed for track: ${trackId}`, sale);
    // You could show a toast notification here
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          href="/artists"
          className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground mb-8 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t.artists.backToArtists}
        </Link>

        {/* Artist Profile */}
        <div className="flex flex-col sm:flex-row gap-8 mb-12">
          {artist.avatar && (
            <div className="flex-shrink-0">
              <Image
                src={artist.avatar}
                alt={artist.name}
                width={160}
                height={160}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-border"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">{artist.name}</h1>
            {artist.bio && (
              <p className="text-lg text-foreground/70 mb-6 max-w-2xl">
                {artist.bio}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="font-mono">{formatAddress(artist.walletAddress)}</span>
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {t.artists.tracks} ({tracks.length})
          </h2>
          {tracks.length === 0 ? (
            <p className="text-foreground/70">{t.artists.noTracks}</p>
          ) : (
            <div className="space-y-6">
              {tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

