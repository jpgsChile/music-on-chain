"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calculateArtistStats, ArtistStats } from "@/lib/dashboard";
import { formatUSDC } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import StatCard from "@/components/StatCard";
import CollaboratorEarnings from "@/components/CollaboratorEarnings";
import { useAuth } from "@/lib/auth/useAuth";
import { getArtistByWallet } from "@/data/artists";
import ConnectArtist from "@/components/ConnectArtist";
import ArtistTrackConfig from "@/components/ArtistTrackConfig";
import ArtistProfileForm from "@/components/artist-profile/ArtistProfileForm";

export default function DashboardPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { ready, authenticated, login, user } = useAuth();
  const address = user?.wallet?.address || user?.id || "";
  const canLoadStats = authenticated && Boolean(address);
  const currentArtist = getArtistByWallet(address || "");
  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canLoadStats) {
      setIsLoading(false);
      return;
    }

    // Calculate stats from mock sales
    const artistStats = calculateArtistStats(address);
    setStats(artistStats);
    setIsLoading(false);
  }, [address, canLoadStats]);

  // Refresh stats when sales change (simple polling for demo)
  useEffect(() => {
    if (!canLoadStats) return;

    const interval = setInterval(() => {
      const artistStats = calculateArtistStats(address);
      setStats(artistStats);
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [address, canLoadStats]);

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t.dashboard.title}</h1>
          <div className="border border-border rounded-2xl p-8 sm:p-10 bg-background max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex p-4 rounded-2xl bg-accent/10 text-accent mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t.auth.connectAsArtist}
              </h2>
              <p className="text-sm text-foreground/70">
                {t.dashboard.connectWalletDesc} {t.auth.connectOptions}
              </p>
            </div>
            <div className="flex justify-center">
              <ConnectArtist variant="modal" asCardGrid={false} className="px-6 py-3 rounded-xl font-medium bg-accent text-background hover:bg-accent-hover" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-8">{t.dashboard.title}</h1>
          <div className="text-center text-foreground/70">{t.dashboard.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">{t.dashboard.title}</h1>
          <p className="text-foreground/70 text-lg">
            {t.dashboard.subtitle}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title={t.dashboard.totalEarned}
            value={`$${formatUSDC(stats?.totalEarned || 0)}`}
            subtitle={t.general.usdc}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title={t.dashboard.totalSales}
            value={stats?.totalSales.toString() || "0"}
            subtitle={t.dashboard.salesSubtitle}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
          <StatCard
            title={t.dashboard.platformFees}
            value={`$${formatUSDC(stats?.totalPlatformFees || 0)}`}
            subtitle={t.dashboard.feesSubtitle}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            }
          />
        </div>

        {/* Collaborator Earnings */}
        <div className="mb-8">
          <CollaboratorEarnings
            earnings={stats?.collaboratorEarnings || []}
          />
        </div>

        {/* Enlaces rápidos */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/canciones"
            className="text-sm font-medium text-accent hover:underline"
          >
            🎵 {t.dashboard.ingresarCanciones}
          </Link>
          <Link
            href="/dashboard/tickets"
            className="text-sm font-medium text-accent hover:underline"
          >
            🎟️ {t.dashboard.tickets}
          </Link>
          <Link
            href="/dashboard/upload"
            className="text-sm font-medium text-accent hover:underline"
          >
            📤 Subir canción (NFT)
          </Link>
        </div>

        {/* Perfil de artista (solo artistas: wallet como llave; reutilizable en todas las obras) */}
        {address && (
          <div className="mb-8">
            <ArtistProfileForm wallet={address} />
          </div>
        )}

        {/* Configuración de canciones / Declaración de obras */}
        <div className="mb-8">
          {currentArtist ? (
            <ArtistTrackConfig artist={currentArtist} />
          ) : (
            <div className="border border-border rounded-lg p-6 bg-background">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {t.dashboard.trackConfig}
              </h3>
              <p className="text-sm text-foreground/60 mb-4">
                {t.dashboard.notArtistWallet}
              </p>
              <Link
                href="/dashboard/canciones"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent-hover"
              >
                🎵 {t.dashboard.ingresarCanciones}
              </Link>
            </div>
          )}
        </div>

        {/* Info Note */}
        {stats && stats.totalSales === 0 && (
          <div className="border border-border rounded-lg p-6 bg-background">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-foreground/40 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-foreground/70">
                <p className="font-medium text-foreground mb-1">
                  {t.dashboard.noSales}
                </p>
                <p>
                  {t.dashboard.noSalesDesc}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
