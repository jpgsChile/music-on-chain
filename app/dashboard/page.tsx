"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateArtistStats, type ArtistStats } from "@/lib/dashboard";
import { formatUSDC } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import { getArtistByWallet } from "@/data/artists";
import { useArtistProfile } from "@/lib/artist-profile/useArtistProfile";
import StatCard from "@/components/StatCard";
import {
  StudioEmptyState,
  StudioLoading,
  StudioPageHeader,
  StudioProgress,
  StudioSuccess,
} from "@/components/studio/StudioStates";

export default function StudioDashboardPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.dashboard;
  const { actorRef, walletAddress } = useStudioIdentity();
  const address = walletAddress || "";
  const currentArtist = getArtistByWallet(address || "");
  const { profile, loading: profileLoading } = useArtistProfile(address, actorRef);
  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    setStats(calculateArtistStats(address));
    setLoading(false);
  }, [address]);

  const hasSales = Boolean(stats && stats.totalSales > 0);
  const hasChannel = Boolean(profile?.artisticName?.trim());
  const setupDone = [hasChannel, hasSales || Boolean(currentArtist), hasSales].filter(Boolean).length;

  const nextAction = useMemo(() => {
    if (!hasChannel) return { href: "/dashboard/channel", label: t.ctaChannel };
    if (!hasSales) return { href: "/dashboard/release", label: t.ctaRelease };
    return { href: "/dashboard/sales", label: t.ctaSales };
  }, [hasChannel, hasSales, t]);

  if (loading || profileLoading) {
    return <StudioLoading label={t.loading} />;
  }

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

      <div className="mb-6">
        <StudioProgress label={t.setupSteps} current={setupDone} total={3} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <Link
          href="/dashboard/release"
          className="rounded-xl border border-border bg-background p-4 hover:border-accent/40 transition-colors"
        >
          <p className="font-medium text-foreground">{t.ctaRelease}</p>
          <p className="text-xs text-foreground/50 mt-1">{t.stepRelease}</p>
        </Link>
        <Link
          href="/dashboard/music"
          className="rounded-xl border border-border bg-background p-4 hover:border-accent/40 transition-colors"
        >
          <p className="font-medium text-foreground">{t.ctaMusic}</p>
          <p className="text-xs text-foreground/50 mt-1">{t.stepMusic}</p>
        </Link>
        <Link
          href="/dashboard/channel"
          className="rounded-xl border border-border bg-background p-4 hover:border-accent/40 transition-colors"
        >
          <p className="font-medium text-foreground">{t.ctaChannel}</p>
          <p className="text-xs text-foreground/50 mt-1">{t.stepChannel}</p>
        </Link>
      </div>

      {!hasSales ? (
        <StudioEmptyState
          title={t.emptyTitle}
          description={t.emptyDesc}
          ctaLabel={t.emptyCta}
          ctaHref="/dashboard/release"
        />
      ) : (
        <div className="space-y-6">
          <StudioSuccess title={t.successTitle} description={t.successDesc} ctaLabel={t.ctaSales} ctaHref="/dashboard/sales" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title={t.metricRevenue} value={`$${formatUSDC(stats?.totalEarned || 0)}`} subtitle="USDC" />
            <StatCard title={t.metricSales} value={String(stats?.totalSales || 0)} />
            <StatCard title={t.metricFees} value={`$${formatUSDC(stats?.totalPlatformFees || 0)}`} subtitle="USDC" />
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-background p-5">
        <p className="text-sm text-foreground/50 mb-2">{t.nextBest}</p>
        <Link
          href={nextAction.href}
          className="inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-background hover:bg-accent-hover"
        >
          {nextAction.label}
        </Link>
      </div>
    </div>
  );
}
