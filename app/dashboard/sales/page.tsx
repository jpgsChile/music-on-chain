"use client";

import { useEffect, useState } from "react";
import { calculateArtistStats, type ArtistStats } from "@/lib/dashboard";
import { formatUSDC } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import StellarEvidence from "@/components/fan-economy/StellarEvidence";
import StatCard from "@/components/StatCard";
import {
  StudioEmptyState,
  StudioLoading,
  StudioPageHeader,
  StudioProgress,
  StudioSuccess,
} from "@/components/studio/StudioStates";

type MoneyWire = { units: string; scale: number; asset: string };

type FanSupportRow = {
  entitlementId: string;
  redemptionId: string | null;
  revenueId: string;
  releaseId: string | null;
  releaseTitle: string;
  beneficiaryName: string;
  gross: MoneyWire;
  amount: MoneyWire;
  status: string;
};

function formatMoney(amount: MoneyWire): string {
  const value = Number(amount.units) / 10 ** amount.scale;
  return `$${value.toFixed(amount.scale > 0 ? 2 : 0)} ${amount.asset}`;
}

export default function StudioSalesPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.sales;
  const d = getTranslations(locale).studio.dashboard;
  const { user } = useAuth();
  const { actorRef } = useStudioIdentity();
  const address = user?.wallet?.address || "";
  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [fanSupports, setFanSupports] = useState<FanSupportRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const goal = Number(t.goal) || 5;

  useEffect(() => {
    if (address) setStats(calculateArtistStats(address));
    else setStats(null);
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    async function loadFanSupports() {
      setLoading(true);
      try {
        const [entRes, relRes, profileRes] = await Promise.all([
          fetch("/api/economics/entitlements", { credentials: "include" }),
          fetch("/api/releases", { credentials: "include" }),
          fetch("/api/artist/profile", { credentials: "include" }),
        ]);
        const entJson = await entRes.json().catch(() => ({}));
        const relJson = await relRes.json().catch(() => ({}));
        const profileJson = await profileRes.json().catch(() => ({}));

        const releases = Array.isArray(relJson.value) ? relJson.value : [];
        const titleById = new Map<string, string>();
        const ownerNameByRelease = new Map<string, string>();
        for (const row of releases as {
          id: string;
          title?: string;
          participations?: { actorRef?: string | null; displayName?: string; revenueSharePercent?: number }[];
        }[]) {
          titleById.set(row.id, row.title ?? row.id);
          const owner = (row.participations ?? []).find(
            (p) => p.actorRef === actorRef || (p.revenueSharePercent ?? 0) >= 100
          );
          if (owner?.displayName) ownerNameByRelease.set(row.id, owner.displayName);
        }
        const artisticName =
          typeof profileJson?.artisticName === "string" && profileJson.artisticName.trim()
            ? profileJson.artisticName.trim()
            : null;

        const rows = Array.isArray(entJson.value) ? entJson.value : [];
        const supports: FanSupportRow[] = rows
          .filter(
            (row: {
              origin?: { kind?: string } | null;
              amount?: MoneyWire;
              gross?: MoneyWire | null;
            }) => row?.origin?.kind === "redemption" && row.amount && row.gross
          )
          .map(
            (row: {
              entitlementId: string;
              revenueId: string;
              releaseId?: string | null;
              amount: MoneyWire;
              gross: MoneyWire;
              status: string;
              origin?: { kind?: string; id?: string } | null;
            }) => ({
              entitlementId: row.entitlementId,
              redemptionId: row.origin?.kind === "redemption" ? row.origin.id ?? null : null,
              revenueId: row.revenueId,
              releaseId: row.releaseId ?? null,
              releaseTitle: row.releaseId ? titleById.get(row.releaseId) ?? row.releaseId : "—",
              beneficiaryName:
                artisticName ??
                (row.releaseId ? ownerNameByRelease.get(row.releaseId) : null) ??
                "—",
              gross: row.gross,
              amount: row.amount,
              status: row.status,
            })
          );

        if (!cancelled) setFanSupports(supports);
      } catch {
        if (!cancelled) setFanSupports([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFanSupports();
    return () => {
      cancelled = true;
    };
  }, [actorRef]);

  if (loading && fanSupports === null) return <StudioLoading label={t.loading} />;

  const sales = stats?.totalSales ?? 0;
  const hasLicenseSales = sales > 0;
  const supports = fanSupports ?? [];
  const hasFanSupports = supports.length > 0;

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-foreground/55">{t.fanSupportTitle}</h2>
        <p className="mb-4 text-sm text-foreground/60">{t.fanSupportHint}</p>
        {!hasFanSupports ? (
          <p className="rounded-2xl border border-border bg-background/60 px-4 py-5 text-sm text-foreground/60">
            {t.fanSupportEmpty}
          </p>
        ) : (
          <ul className="space-y-3">
            {supports.map((row) => (
              <li key={row.entitlementId} className="rounded-2xl border border-border bg-background/80 p-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-foreground/45">{t.releaseLabel}</dt>
                    <dd className="font-semibold">{row.releaseTitle}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-foreground/45">{t.originLabel}</dt>
                    <dd className="font-medium">{t.originFanSupport}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-foreground/45">{t.grossLabel}</dt>
                    <dd className="font-semibold">{formatMoney(row.gross)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-foreground/45">{t.entitlementLabel}</dt>
                    <dd className="font-semibold">
                      {row.beneficiaryName} · {formatMoney(row.amount)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-foreground/45">{t.economicRecord}</dt>
                    <dd className="mt-1 font-medium text-foreground/90">{t.economicCreated}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-foreground/45">{t.statusLabel}</dt>
                    <dd className="mt-1">
                      <span className="font-medium text-foreground/90">
                        {row.status === "accrued" ? t.statusAccrued : row.status === "settled" ? t.statusSettled : row.status}
                      </span>
                      {row.status === "accrued" ? (
                        <span className="mt-1 block text-sm text-foreground/60">{t.statusAccruedHint}</span>
                      ) : null}
                    </dd>
                  </div>
                  {row.redemptionId ? (
                    <div className="sm:col-span-2">
                      <StellarEvidence redemptionId={row.redemptionId} />
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-foreground/55">{t.licenseSalesTitle}</h2>
        <div className="mb-6">
          <StudioProgress label={t.progressLabel} current={Math.min(sales, goal)} total={goal} />
        </div>

        {!hasLicenseSales ? (
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
      </section>
    </div>
  );
}
