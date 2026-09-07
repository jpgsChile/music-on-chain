"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import {
  StudioEmptyState,
  StudioLoading,
  StudioPageHeader,
  StudioProgress,
  StudioSuccess,
} from "@/components/studio/StudioStates";

type ParticipationRow = {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  revenueSharePercent: number;
  actorRef: string | null;
  release: { id: string; title: string };
};

export default function StudioCollaboratorsPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.collaborators;
  const { actorRef } = useStudioIdentity();
  const [rows, setRows] = useState<ParticipationRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/participations?actorRef=${encodeURIComponent(actorRef)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data.value) ? data.value : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [actorRef]);

  if (rows == null) return <StudioLoading label={t.loading} />;

  const ready = rows.length > 0;

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mb-6">
        <StudioProgress label={t.progressLabel} current={ready ? 1 : 0} total={1} />
      </div>

      {!ready ? (
        <StudioEmptyState
          title={t.emptyTitle}
          description={t.emptyDesc}
          ctaLabel={t.emptyCta}
          ctaHref="/dashboard/release"
        />
      ) : (
        <div className="space-y-4">
          <StudioSuccess title={t.successTitle} description={t.successDesc} />
          <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {rows.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-background"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.displayName}</p>
                  <p className="text-xs text-foreground/50">
                    {s.release.title} · {s.role}
                  </p>
                </div>
                <span className="text-sm font-mono text-foreground/70">
                  {s.revenueSharePercent}%
                </span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/release" className="inline-flex text-sm text-accent hover:underline">
            {t.emptyCta}
          </Link>
        </div>
      )}
    </div>
  );
}
