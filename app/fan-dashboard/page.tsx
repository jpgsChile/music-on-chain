"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
import { useTrackOwnership } from "@/lib/ownership/useTrackOwnership";
import { useContributions } from "@/lib/crowdfunding/useContributions";
import { useTicketOwnership } from "@/lib/tickets/useTicketOwnership";
import FanTicketList from "@/components/tickets/FanTicketList";
import { artists, getArtistBySlug } from "@/data/artists";
import GatedAudioPlayer from "@/components/GatedAudioPlayer";
import FanWalletCard from "@/components/FanWalletCard";
import { formatUSDC } from "@/lib/utils";

export default function FanDashboardPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { ready, authenticated, login, user } = useAuth();
  const wallet = user?.wallet?.address ?? "";
  const { ownership } = useTrackOwnership();
  const contributions = useContributions(wallet);
  const { tickets: myTickets } = useTicketOwnership(wallet);

  const myOwnership = useMemo(
    () =>
      !wallet
        ? []
        : ownership.filter(
            (o) => o.buyer.toLowerCase() === wallet.toLowerCase()
          ),
    [ownership, wallet]
  );

  const uniqueArtistSlugs = useMemo(() => {
    const set = new Set<string>();
    myOwnership.forEach((o) => set.add(o.artist));
    contributions.forEach((c) => set.add(c.artist));
    return Array.from(set);
  }, [myOwnership, contributions]);

  const myArtists = useMemo(
    () => uniqueArtistSlugs.map((slug) => getArtistBySlug(slug)).filter(Boolean),
    [uniqueArtistSlugs]
  );

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">{t.fanDashboard.title}</h1>
          <div className="border border-border rounded-lg p-8 bg-background text-center">
            <p className="text-foreground/70 mb-4">{t.fanDashboard.connectToSee}</p>
            <button
              onClick={login}
              disabled={!ready}
              className="px-4 py-2 text-sm bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {ready ? t.auth.signIn : t.auth.loading}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t.fanDashboard.title}</h1>
          <p className="text-foreground/70">{t.fanDashboard.subtitle}</p>
        </div>

        {/* Tu cuenta Music On Chain (solo si hay dirección tipo wallet) */}
        {wallet.startsWith("0x") && wallet.length >= 42 && (
          <FanWalletCard address={wallet} />
        )}

        {/* Mis entradas */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            🎟️ {t.tickets?.myTickets ?? "Mis entradas"}
          </h2>
          <FanTicketList tickets={myTickets} />
        </section>

        {/* Mi Playlist */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t.fanDashboard.myPlaylist}
          </h2>
          {myOwnership.length === 0 ? (
            <p className="text-foreground/60">{t.fanDashboard.noPurchases}</p>
          ) : (
            <ul className="space-y-4">
              {myOwnership.map((o) => {
                const artist = getArtistBySlug(o.artist);
                const track = artist?.tracks.find((tr) => tr.id === o.trackId);
                if (!artist || !track) return null;
                return (
                  <li
                    key={`${o.artist}-${o.trackId}-${o.purchasedAt}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{track.title}</p>
                      <p className="text-sm text-foreground/60">{artist.name}</p>
                    </div>
                    <div className="w-full sm:w-72 flex-shrink-0">
                      <GatedAudioPlayer
                        src={track.audioUrl}
                        title={track.title}
                        isOwned
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Historial de Compras (tracks + contribuciones) */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t.fanDashboard.purchaseHistory}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-foreground/70">
                  <th className="py-2 pr-4">{t.fanDashboard.track}</th>
                  <th className="py-2 pr-4">{t.fanDashboard.artist}</th>
                  <th className="py-2 pr-4">{t.fanDashboard.date}</th>
                  <th className="py-2 pr-4">{t.fanDashboard.amount}</th>
                  <th className="py-2 pr-4">{t.fanDashboard.txHash}</th>
                </tr>
              </thead>
              <tbody className="text-foreground/90">
                {myOwnership.map((o) => {
                  const artist = getArtistBySlug(o.artist);
                  const track = artist?.tracks.find((tr) => tr.id === o.trackId);
                  const date = o.purchasedAt
                    ? new Date(o.purchasedAt).toLocaleDateString()
                    : "—";
                  return (
                    <tr key={`t-${o.artist}-${o.trackId}-${o.txHash}`} className="border-b border-border/50">
                      <td className="py-2 pr-4">{track?.title ?? o.trackId}</td>
                      <td className="py-2 pr-4">
                        <Link href={`/artist/${o.artist}`} className="hover:text-accent">
                          {artist?.name ?? o.artist}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{date}</td>
                      <td className="py-2 pr-4">
                        {track ? formatUSDC(track.price) : "—"} AVAX
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs truncate max-w-[100px]" title={o.txHash}>
                        {o.txHash ? `${o.txHash.slice(0, 8)}…` : "—"}
                      </td>
                    </tr>
                  );
                })}
                {contributions.map((c) => (
                  <tr key={`c-${c.artist}-${c.contributedAt}-${c.txHash}`} className="border-b border-border/50">
                    <td className="py-2 pr-4">{t.fanDashboard.contribution}</td>
                    <td className="py-2 pr-4">
                      <Link href={`/artist/${c.artist}`} className="hover:text-accent">
                        {getArtistBySlug(c.artist)?.name ?? c.artist}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      {c.contributedAt
                        ? new Date(c.contributedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">{formatUSDC(c.amount)} AVAX</td>
                    <td className="py-2 pr-4 font-mono text-xs truncate max-w-[100px]" title={c.txHash}>
                      {c.txHash ? `${c.txHash.slice(0, 8)}…` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {myOwnership.length === 0 && contributions.length === 0 && (
            <p className="text-foreground/60 mt-2">{t.fanDashboard.noPurchases}</p>
          )}
        </section>

        {/* Mis Artistas */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t.fanDashboard.myArtists}
          </h2>
          {myArtists.length === 0 ? (
            <p className="text-foreground/60">{t.fanDashboard.noPurchases}</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myArtists.map((artist) => (
                <li key={artist!.slug}>
                  <Link
                    href={`/artist/${artist!.slug}`}
                    className="block p-4 rounded-xl border border-border bg-background hover:border-accent/40 transition-colors"
                  >
                    <span className="font-medium text-foreground">{artist!.name}</span>
                    <span className="text-foreground/60 text-sm block mt-1">
                      {t.artistPage.viewArtist} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
