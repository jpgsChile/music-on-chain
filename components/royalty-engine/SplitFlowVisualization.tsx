"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUSDC } from "@/lib/utils";
import type { RoyaltyEngineSnapshot } from "@/lib/royalty-engine/types";
import RoyaltyAvatar from "./RoyaltyAvatar";

type Labels = {
  title: string;
  subtitle: string;
  saleLabel: string;
  simulate: string;
  replay: string;
  settledIn: string;
};

interface Props {
  snapshot: RoyaltyEngineSnapshot;
  saleAmount?: number;
  roleLabels: Record<string, string>;
  labels: Labels;
  autoPlay?: boolean;
}

export default function SplitFlowVisualization({
  snapshot,
  saleAmount = 10,
  roleLabels,
  labels,
  autoPlay = true,
}: Props) {
  const [phase, setPhase] = useState<"idle" | "incoming" | "splitting" | "done">("idle");
  const [runId, setRunId] = useState(0);

  const start = () => {
    setRunId((n) => n + 1);
    setPhase("incoming");
  };

  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(start, 600);
      return () => clearTimeout(t);
    }
  }, [autoPlay]);

  useEffect(() => {
    if (phase === "incoming") {
      const t = setTimeout(() => setPhase("splitting"), 900);
      return () => clearTimeout(t);
    }
    if (phase === "splitting") {
      const t = setTimeout(() => setPhase("done"), 1600);
      return () => clearTimeout(t);
    }
  }, [phase, runId]);

  const split = snapshot.defaultSplit;

  return (
    <section className="rounded-2xl border border-border bg-background/90 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{labels.title}</h2>
          <p className="mt-0.5 text-sm text-foreground/55">{labels.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={start}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          {phase === "idle" || phase === "done" ? labels.replay : labels.simulate}
        </button>
      </div>

      <div className="relative px-5 py-8 sm:py-10">
        {/* Source: sale */}
        <div className="flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`sale-${runId}-${phase}`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{
                scale: phase === "idle" ? 0.95 : 1,
                opacity: 1,
                boxShadow:
                  phase === "incoming" || phase === "splitting"
                    ? "0 0 40px rgba(0,212,255,0.25)"
                    : "0 0 0 rgba(0,0,0,0)",
              }}
              className="rounded-2xl border border-accent/40 bg-accent/10 px-6 py-4 text-center min-w-[160px]"
            >
              <p className="text-[11px] uppercase tracking-wider text-accent/80">
                {labels.saleLabel}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-foreground">
                ${formatUSDC(saleAmount)}
              </p>
              <p className="text-xs text-foreground/50 mt-0.5">USDC</p>
            </motion.div>
          </AnimatePresence>

          {/* Flow line */}
          <div className="relative h-16 w-px my-1 overflow-hidden">
            <div className="absolute inset-0 bg-border" />
            <AnimatePresence>
              {(phase === "incoming" || phase === "splitting") && (
                <motion.div
                  key={`drop-${runId}`}
                  className="absolute left-1/2 w-2 h-2 -ml-1 rounded-full bg-accent"
                  initial={{ top: 0, opacity: 1 }}
                  animate={{ top: "100%", opacity: [1, 1, 0] }}
                  transition={{ duration: 0.8, ease: "easeIn" }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Split bar */}
        <div className="mx-auto max-w-xl">
          <div className="h-3 overflow-hidden rounded-full bg-border flex">
            {split.map((s, i) => (
              <motion.div
                key={s.role}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ backgroundColor: s.color }}
                initial={{ width: 0 }}
                animate={{
                  width: phase === "idle" ? `${s.percentage}%` : `${s.percentage}%`,
                  opacity: phase === "idle" ? 0.45 : 1,
                }}
                transition={{ delay: phase === "splitting" ? 0.15 * i : 0, duration: 0.5 }}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {split.map((s, i) => {
              const amount = (saleAmount * s.percentage) / 100;
              const showAmount = phase === "splitting" || phase === "done";
              return (
                <motion.div
                  key={s.role}
                  className="rounded-xl border border-border px-3 py-3 text-center"
                  initial={{ y: 12, opacity: 0 }}
                  animate={{
                    y: showAmount ? 0 : 8,
                    opacity: showAmount ? 1 : 0.5,
                  }}
                  transition={{ delay: phase === "splitting" ? 0.2 + i * 0.12 : 0 }}
                >
                  <div className="flex justify-center mb-2">
                    <RoyaltyAvatar name={s.name} color={s.color} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">
                    {roleLabels[s.role] || s.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground/45">{s.percentage}%</p>
                  <AnimatePresence>
                    {showAmount ? (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 font-mono text-sm font-semibold"
                        style={{ color: s.color }}
                      >
                        +${formatUSDC(amount)}
                      </motion.p>
                    ) : (
                      <p className="mt-2 font-mono text-sm text-foreground/25">—</p>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-5 text-center text-xs text-foreground/40">
            {labels.settledIn}
          </p>
        </div>
      </div>
    </section>
  );
}
