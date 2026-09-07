"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import { getArtistByWallet } from "@/data/artists";
import type { Artist } from "@/data/artists";
import ArtistTrackConfig from "@/components/ArtistTrackConfig";

/**
 * Página "Declaración de obras / Ingresar canciones".
 * Cualquier artista con wallet conectada puede declarar sus canciones.
 * Si la wallet está registrada en la plataforma, usa su perfil; si no, usa un perfil por wallet.
 */
export default function DashboardCancionesPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { actorRef, walletAddress } = useStudioIdentity();
  const wallet = walletAddress ?? "";

  const artist = useMemo((): Artist => {
    const known = wallet ? getArtistByWallet(wallet) : undefined;
    if (known) return known;
    const slug = wallet
      ? `wallet-${wallet.slice(2, 10).toLowerCase()}`
      : `actor-${actorRef.slice(-8)}`;
    return {
      slug,
      name: t.dashboard.declaracionObras ?? "Mis obras",
      description: "",
      logoUrl: "",
      coverUrl: "",
      wallet,
      tracks: [],
    };
  }, [wallet, actorRef, t.dashboard.declaracionObras]);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-foreground/70 hover:text-foreground"
          >
            ← {t.dashboard.title}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t.dashboard.declaracionObras ?? t.dashboard.ingresarCanciones}
        </h1>
        <p className="text-foreground/70 text-sm mb-4">
          {t.dashboard.trackConfigDesc}
        </p>
        <Link
          href="/dashboard/upload"
          className="inline-flex mb-6 text-sm text-accent hover:underline"
        >
          {t.dashboard.goPublishCanonical}
        </Link>

        {artist && (
          <ArtistTrackConfig artist={artist} />
        )}

        {artist && artist.slug.startsWith("wallet-") && (
          <p className="mt-4 text-xs text-foreground/50">
            {t.dashboard.localWorksHint}
          </p>
        )}
      </div>
    </div>
  );
}
