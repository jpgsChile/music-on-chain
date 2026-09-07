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

export default function StudioAnalyticsPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.analytics;
  const { user } = useAuth();
  const address = user?.wallet?.address || "";
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

  if (loading) return <StudioLoading label={t.loading} />;

  const sales = stats?.totalSales ?? 0;
  const earned = stats?.totalEarned ?? 0;
  const avg = sales > 0 ? earned / sales : 0;
  const has = sales > 0;

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mb-6">
        <StudioProgress label={t.progressLabel} current={Math.min(sales, 3)} total={3} />
      </div>

      {!has ? (
        <StudioEmptyState
          title={t.emptyTitle}
          description={t.emptyDesc}
          ctaLabel={t.emptyCta}
          ctaHref="/dashboard"
        />
      ) : (
        <div className="space-y-6">
          <StudioSuccess title={t.successTitle} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title={t.cardAvg} value={`$${formatUSDC(avg)}`} subtitle="USDC" />
            <StatCard title={t.cardVolume} value={String(sales)} />
            <StatCard
              title={t.cardTrend}
              value={sales >= 3 ? t.trendUp : t.trendFlat}
            />
          </div>
        </div>
      )}
    </div>
  );
}
