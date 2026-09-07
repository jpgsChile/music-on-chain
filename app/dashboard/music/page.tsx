"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import { getArtistByWallet } from "@/data/artists";
import type { Artist } from "@/data/artists";
import ArtistTrackConfig from "@/components/ArtistTrackConfig";
import {
  StudioEmptyState,
  StudioLoading,
  StudioPageHeader,
  StudioProgress,
  StudioSuccess,
} from "@/components/studio/StudioStates";

export default function StudioMusicPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.music;
  const dash = getTranslations(locale).dashboard;
  const { actorRef, walletAddress } = useStudioIdentity();
  const wallet = walletAddress ?? "";
  const [persistedCount, setPersistedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/releases?actorRef=${encodeURIComponent(actorRef)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const releases = Array.isArray(data.value) ? data.value : [];
        const tracks = releases.reduce(
          (n: number, release: { tracks?: unknown[] }) => n + (release.tracks?.length ?? 0),
          0
        );
        setPersistedCount(tracks);
      })
      .catch(() => {
        if (!cancelled) setPersistedCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [actorRef]);

  const artist = useMemo((): Artist => {
    const known = wallet ? getArtistByWallet(wallet) : undefined;
    if (known) return known;
    return {
      slug: wallet ? `wallet-${wallet.slice(2, 10).toLowerCase()}` : `actor-${actorRef.slice(-8)}`,
      name: dash.declaracionObras,
      description: "",
      logoUrl: "",
      coverUrl: "",
      wallet: wallet,
      tracks: [],
    };
  }, [wallet, actorRef, dash.declaracionObras]);

  if (persistedCount == null) return <StudioLoading label={t.loading} />;

  const count = Math.max(artist.tracks?.length ?? 0, persistedCount);

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <StudioProgress label={t.manageHint} current={Math.min(count, 5)} total={5} />
        <Link
          href="/dashboard/release"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover"
        >
          {t.ctaRelease}
        </Link>
      </div>

      {count === 0 ? (
        <StudioEmptyState
          title={t.emptyTitle}
          description={t.emptyDesc}
          ctaLabel={t.emptyCta}
          ctaHref="/dashboard/release"
        />
      ) : (
        <div className="mb-6">
          <StudioSuccess title={t.successTitle} description={t.manageHint} />
        </div>
      )}

      <div className="mt-6">
        <ArtistTrackConfig artist={artist} />
      </div>
    </div>
  );
}
