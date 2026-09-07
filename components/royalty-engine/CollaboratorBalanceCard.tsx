"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUSDC } from "@/lib/utils";
import type { RoyaltyParticipant } from "@/lib/royalty-engine/types";
import RoyaltyAvatar from "./RoyaltyAvatar";

type Labels = {
  pending: string;
  available: string;
  withdraw: string;
  withdrawing: string;
  withdrawn: string;
  ofSale: string;
};

interface Props {
  participant: RoyaltyParticipant;
  roleLabel: string;
  labels: Labels;
  onWithdraw?: (id: string) => Promise<void> | void;
}

export default function CollaboratorBalanceCard({
  participant,
  roleLabel,
  labels,
  onWithdraw,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const canWithdraw = participant.availableBalance > 0 && status !== "done";

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    setStatus("loading");
    try {
      await onWithdraw?.(participant.id);
      await new Promise((r) => setTimeout(r, 900));
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <motion.article
      layout
      className="rounded-2xl border border-border bg-background/90 p-4 sm:p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <RoyaltyAvatar
          name={participant.name}
          color={participant.color}
          avatarUrl={participant.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">{participant.name}</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${participant.color}22`, color: participant.color }}
            >
              {roleLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-foreground/50">
            {participant.percentage}% {labels.ofSale}
          </p>
        </div>
        <div className="hidden sm:block w-16 shrink-0">
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, participant.percentage)}%`,
                backgroundColor: participant.color,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/70 bg-border/10 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wider text-foreground/40">
            {labels.pending}
          </p>
          <p className="mt-0.5 font-mono text-sm text-foreground/80">
            ${formatUSDC(participant.pendingBalance)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-border/10 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wider text-foreground/40">
            {labels.available}
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            ${formatUSDC(participant.availableBalance)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <AnimatePresence mode="wait">
          {status === "done" ? (
            <motion.p
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-emerald-400 py-2"
            >
              {labels.withdrawn}
            </motion.p>
          ) : (
            <motion.button
              key="btn"
              type="button"
              disabled={!canWithdraw || status === "loading"}
              onClick={() => void handleWithdraw()}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              whileTap={canWithdraw ? { scale: 0.98 } : undefined}
            >
              {status === "loading"
                ? labels.withdrawing
                : `${labels.withdraw} · $${formatUSDC(participant.availableBalance)}`}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
