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
import ArtistProfileForm from "@/components/artist-profile/ArtistProfileForm";

export default function DashboardPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { authenticated, user } = useAuth();
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
    setStats(calculateArtistStats(address));
    setIsLoading(false);
  }, [address, canLoadStats]);

  useEffect(() => {
    if (!canLoadStats) return;
    const interval = setInterval(() => {
      setStats(calculateArtistStats(address));
    }, 2000);
    return () => clearInterval(interval);
  }, [address, canLoadStats]);

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t.dashboard.title}</h1>
          <div className="border border-border rounded-2xl p-8 sm:p-10 bg-background max-w-lg mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t.auth.connectAsArtist}
              </h2>
              <p className="text-sm text-foreground/70">{t.dashboard.connectWalletDesc}</p>
            </div>
            <div className="flex justify-center">
              <ConnectArtist
                variant="modal"
                asCardGrid={false}
                className="px-6 py-3 rounded-xl font-medium bg-accent text-background hover:bg-accent-hover"
              />
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

  const hasSales = Boolean(stats && stats.totalSales > 0);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-accent mb-2">
            {t.dashboard.investorQuestion}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">{t.dashboard.title}</h1>
          <p className="text-foreground/70 text-lg">{t.dashboard.subtitle}</p>
          <p className="mt-2 text-sm text-foreground/50 max-w-2xl">{t.dashboard.thesis}</p>
          <p className="mt-2 text-sm text-foreground/50">
            {t.dashboard.statusLabel}:{" "}
            {hasSales ? t.dashboard.statusHasSales : t.dashboard.statusNoSales}
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-foreground/50 mb-3">
            {t.dashboard.actionsLabel}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              href="/dashboard/upload"
              className="rounded-xl border border-border bg-background p-5 hover:border-accent/40 transition-colors"
            >
              <p className="font-semibold text-foreground">{t.dashboard.primaryPublish}</p>
              <p className="text-sm text-foreground/60 mt-1">{t.dashboard.nextStepPublish}</p>
            </Link>
            <Link
              href="/dashboard/canciones"
              className="rounded-xl border border-border bg-background p-5 hover:border-accent/40 transition-colors"
            >
              <p className="font-semibold text-foreground">{t.dashboard.myTracks}</p>
              <p className="text-sm text-foreground/60 mt-1">{t.dashboard.worksActionDesc}</p>
            </Link>
            <Link
              href="/dashboard/tickets"
              className="rounded-xl border border-border bg-background p-5 hover:border-accent/40 transition-colors"
            >
              <p className="font-semibold text-foreground">{t.dashboard.tickets}</p>
              <p className="text-sm text-foreground/60 mt-1">{t.tickets.createEvent}</p>
            </Link>
          </div>
        </section>

        {authenticated && !currentArtist && (
          <div className="mb-8 border border-border rounded-xl p-4 bg-background max-w-xl">
            <p className="text-sm text-foreground/80">{t.dashboard.notRegisteredHint}</p>
          </div>
        )}

        {!hasSales ? (
          <div className="mb-8 border border-border rounded-xl p-8 bg-background text-center max-w-xl">
            <p className="text-lg font-semibold text-foreground">{t.dashboard.noSales}</p>
            <p className="text-foreground/60 mt-2">{t.dashboard.noSalesDesc}</p>
            <Link
              href="/dashboard/upload"
              className="inline-flex mt-6 px-5 py-2.5 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover"
            >
              {t.dashboard.primaryPublish}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title={t.dashboard.totalEarned}
                value={`$${formatUSDC(stats?.totalEarned || 0)}`}
                subtitle={t.general.usdc}
              />
              <StatCard
                title={t.dashboard.totalSales}
                value={stats?.totalSales.toString() || "0"}
                subtitle={t.dashboard.salesSubtitle}
              />
              <StatCard
                title={t.dashboard.platformFees}
                value={`$${formatUSDC(stats?.totalPlatformFees || 0)}`}
                subtitle={t.dashboard.feesSubtitle}
              />
            </div>
            <div className="mb-8">
              <CollaboratorEarnings earnings={stats?.collaboratorEarnings || []} />
            </div>
          </>
        )}

        {address && (
          <div className="mb-8">
            <ArtistProfileForm wallet={address} />
          </div>
        )}

        <div className="mb-8 border border-border rounded-lg p-6 bg-background">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {t.dashboard.trackConfig}
          </h3>
          <p className="text-sm text-foreground/60 mb-4">{t.dashboard.trackConfigDesc}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/canciones"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-border/30"
            >
              {t.dashboard.myTracks}
            </Link>
            {currentArtist && (
              <Link
                href={`/artist/${currentArtist.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-border/30"
              >
                {t.dashboard.viewPublicProfile}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
