"use client";

import Link from "next/link";

type EmptyProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
};

export function StudioEmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  onCta,
}: EmptyProps) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 px-6 py-14 text-center">
      <div className="mx-auto mb-5 h-12 w-12 rounded-full border border-border bg-border/20" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/55 leading-relaxed">
        {description}
      </p>
      {ctaLabel && (ctaHref || onCta) ? (
        ctaHref ? (
          <Link
            href={ctaHref}
            className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-hover transition-colors"
          >
            {ctaLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onCta}
            className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-hover transition-colors"
          >
            {ctaLabel}
          </button>
        )
      ) : null}
    </div>
  );
}

export function StudioLoading({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 px-6 py-16 text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full bg-accent/30" />
      <p className="text-sm text-foreground/60">{label}</p>
      <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-border">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent/70" />
      </div>
    </div>
  );
}

export function StudioSuccess({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
      <p className="text-sm font-medium text-emerald-400">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-foreground/65">{description}</p>
      ) : null}
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-3 inline-flex text-sm text-accent hover:underline"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function StudioProgress({
  label,
  current,
  total,
}: {
  label: string;
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-foreground/70">{label}</span>
        <span className="font-mono text-foreground/50">
          {current}/{total} · {pct}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StudioPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-8">
      <p className="text-xs uppercase tracking-[0.2em] text-accent mb-2">{eyebrow}</p>
      <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-sm sm:text-base text-foreground/60 max-w-2xl">
        {subtitle}
      </p>
    </header>
  );
}
