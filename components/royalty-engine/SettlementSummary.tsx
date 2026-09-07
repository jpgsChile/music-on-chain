"use client";

import { formatUSDC } from "@/lib/utils";

type Labels = {
  title: string;
  subtitle: string;
  pending: string;
  available: string;
  distributed: string;
  settlement: string;
  settlementHint: string;
};

interface Props {
  totalPending: number;
  totalAvailable: number;
  totalDistributed: number;
  currency: string;
  networkLabel: string;
  labels: Labels;
}

export default function SettlementSummary({
  totalPending,
  totalAvailable,
  totalDistributed,
  currency,
  networkLabel,
  labels,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-accent/10 via-background to-background p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent/80">{labels.title}</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{labels.subtitle}</h2>
        </div>
        <div className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-foreground/60">
          {labels.settlement}: {currency} · {networkLabel}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metric label={labels.pending} value={totalPending} currency={currency} muted />
        <Metric label={labels.available} value={totalAvailable} currency={currency} accent />
        <Metric label={labels.distributed} value={totalDistributed} currency={currency} />
      </div>

      <p className="mt-4 text-xs text-foreground/45 leading-relaxed max-w-2xl">
        {labels.settlementHint}
      </p>
    </section>
  );
}

function Metric({
  label,
  value,
  currency,
  muted,
  accent,
}: {
  label: string;
  value: number;
  currency: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-foreground/40">{label}</p>
      <p
        className={`mt-1 font-mono text-xl font-semibold ${
          accent ? "text-accent" : muted ? "text-foreground/70" : "text-foreground"
        }`}
      >
        ${formatUSDC(value)}
        <span className="ml-1 text-xs font-normal text-foreground/40">{currency}</span>
      </p>
    </div>
  );
}
