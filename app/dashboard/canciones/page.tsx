"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
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
  const { ready, authenticated, login, user } = useAuth();
  const wallet = user?.wallet?.address ?? "";

  const artist = useMemo((): Artist | null => {
    if (!wallet) return null;
    const known = getArtistByWallet(wallet);
    if (known) return known;
    const slug = `wallet-${wallet.slice(2, 10).toLowerCase()}`;
    return {
      slug,
      name: t.dashboard.declaracionObras ?? "Mis obras",
      description: "",
      logoUrl: "",
      coverUrl: "",
      wallet,
      tracks: [],
    };
  }, [wallet, t.dashboard.declaracionObras]);

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">
            {t.dashboard.declaracionObras ?? t.dashboard.ingresarCanciones}
          </h1>
          <p className="text-foreground/70 mb-4">{t.dashboard.connectWalletDesc}</p>
          <button
            onClick={login}
            disabled={!ready}
            className="px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover disabled:opacity-50"
          >
            {ready ? t.auth.signIn : t.auth.loading}
          </button>
        </div>
      </div>
    );
  }

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
        <p className="text-foreground/70 text-sm mb-6">
          {t.dashboard.trackConfigDesc}
        </p>

        {artist && (
          <ArtistTrackConfig artist={artist} />
        )}

        {artist && artist.slug.startsWith("wallet-") && (
          <p className="mt-4 text-xs text-foreground/50">
            Tus canciones se guardan en este navegador. Para tener una página
            pública de artista en la plataforma, tu wallet debe estar registrada
            como artista.
          </p>
        )}
      </div>
    </div>
  );
}
