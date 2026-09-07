"use client";

import { motion } from "framer-motion";
import { formatUSDC } from "@/lib/utils";
import type { RoyaltyPaymentEvent, RoyaltyParticipant } from "@/lib/royalty-engine/types";

type Labels = {
  title: string;
  empty: string;
  statusSettled: string;
  statusProcessing: string;
  statusPending: string;
  splitHint: string;
};

interface Props {
  payments: RoyaltyPaymentEvent[];
  participants: RoyaltyParticipant[];
  labels: Labels;
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

export default function PaymentsTimeline({ payments, participants, labels }: Props) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const locale =
    typeof navigator !== "undefined" && navigator.language?.startsWith("en")
      ? "en"
      : "es";

  if (!payments.length) {
    return (
      <section className="rounded-2xl border border-border bg-background/90 p-6">
        <h2 className="text-base font-semibold text-foreground">{labels.title}</h2>
        <p className="mt-3 text-sm text-foreground/50">{labels.empty}</p>
      </section>
    );
  }

  const statusLabel = {
    settled: labels.statusSettled,
    processing: labels.statusProcessing,
    pending: labels.statusPending,
  };

  return (
    <section className="rounded-2xl border border-border bg-background/90 overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">{labels.title}</h2>
      </div>
      <ol className="relative divide-y divide-border">
        {payments.map((pay, index) => (
          <motion.li
            key={pay.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative px-5 py-4 pl-12"
          >
            <span
              className={`absolute left-5 top-5 h-2.5 w-2.5 rounded-full ${
                pay.status === "settled"
                  ? "bg-emerald-400"
                  : pay.status === "processing"
                    ? "bg-accent animate-pulse"
                    : "bg-foreground/30"
              }`}
            />
            {index < payments.length - 1 ? (
              <span className="absolute left-[1.35rem] top-8 bottom-0 w-px bg-border" />
            ) : null}

            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{pay.workTitle}</p>
                <p className="text-xs text-foreground/45 mt-0.5">
                  {formatWhen(pay.at, locale === "en" ? "en-US" : "es-ES")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-foreground">
                  +${formatUSDC(pay.grossAmount)} {pay.currency}
                </p>
                <p
                  className={`text-[11px] mt-0.5 ${
                    pay.status === "settled"
                      ? "text-emerald-400"
                      : pay.status === "processing"
                        ? "text-accent"
                        : "text-foreground/45"
                  }`}
                >
                  {statusLabel[pay.status]}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {pay.splits.map((s) => {
                const p = byId.get(s.participantId);
                return (
                  <span
                    key={s.participantId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/70"
                    title={labels.splitHint}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: p?.color || "#888" }}
                    />
                    {p?.name || "—"} · ${formatUSDC(s.amount)}
                  </span>
                );
              })}
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
