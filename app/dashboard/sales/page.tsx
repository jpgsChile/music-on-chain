"use client";

import { useEffect, useState } from "react";
import { calculateArtistStats, type ArtistStats } from "@/lib/dashboard";
import { formatUSDC } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
import StatCard from "@/components/StatCard";
import {
  StudioEmptyState,
  StudioLoading,
  StudioPageHeader,
  StudioProgress,
  StudioSuccess,
} from "@/components/studio/StudioStates";

export default function StudioSalesPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.sales;
  const d = getTranslations(locale).studio.dashboard;
  const { user } = useAuth();
  const address = user?.wallet?.address || "";
  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const goal = Number(t.goal) || 5;

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    setStats(calculateArtistStats(address));
    setLoading(false);
  }, [address]);

  if (loading) return <StudioLoading label={t.loading} />;

  const sales = stats?.totalSales ?? 0;
  const has = sales > 0;

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mb-6">
        <StudioProgress label={t.progressLabel} current={Math.min(sales, goal)} total={goal} />
      </div>

      {!has ? (
        <StudioEmptyState
          title={t.emptyTitle}
          description={t.emptyDesc}
          ctaLabel={t.emptyCta}
          ctaHref="/dashboard/release"
        />
      ) : (
        <div className="space-y-6">
          <StudioSuccess title={t.successTitle} description={t.successDesc} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title={d.metricRevenue} value={`$${formatUSDC(stats?.totalEarned || 0)}`} subtitle="USDC" />
            <StatCard title={d.metricSales} value={String(sales)} />
            <StatCard title={d.metricFees} value={`$${formatUSDC(stats?.totalPlatformFees || 0)}`} subtitle="USDC" />
          </div>
        </div>
      )}
    </div>
  );
}
