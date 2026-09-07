"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";

type LedgerCopy = {
  ledgerTitle: string;
  ledgerHint: string;
  emptyLedger: string;
  simulateRevenue: string;
  settle: string;
  accrued: string;
  settled: string;
  gross: string;
  net: string;
  protocolFee: string;
  error: string;
  execPending: string;
  execSubmitted: string;
  execConfirmed: string;
  execFailed: string;
  execUnknown: string;
};

type EntitlementWire = {
  entitlementId: string;
  actorRef: string;
  revenueId: string;
  status: string;
  shareBps: number;
  amount: { units: string; scale: number; asset: string };
  execution?: {
    intentRef: string;
    lifecycle: string;
    receipt?: { status?: string; externalRef?: string } | null;
  } | null;
};

function formatAmount(amount: { units: string; scale: number; asset: string }) {
  const value = Number(amount.units) / 10 ** amount.scale;
  return `${value.toFixed(2)} ${amount.asset}`;
}

function executionLabel(copy: LedgerCopy, row: EntitlementWire): string {
  const status = row.execution?.receipt?.status ?? row.execution?.lifecycle;
  if (row.status === "settled" || status === "CONFIRMED" || status === "confirmed") {
    return copy.execConfirmed;
  }
  if (status === "SUBMITTED" || status === "submitted") return copy.execSubmitted;
  if (status === "FAILED" || status === "failed") return copy.execFailed;
  if (status === "UNKNOWN" || status === "unknown") return copy.execUnknown;
  if (status === "pending" || status === "ACCEPTED" || status === "accepted") return copy.execPending;
  return copy.accrued;
}

export default function EconomicLedger({ copy }: { copy: LedgerCopy }) {
  const { actorRef } = useStudioIdentity();
  const [rows, setRows] = useState<EntitlementWire[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/economics/entitlements", {
      headers: { "x-actor-ref": actorRef },
    });
    const data = await res.json().catch(() => ({}));
    setRows(Array.isArray(data.value) ? data.value : []);
  }, [actorRef]);

  useEffect(() => {
    refresh().catch(() => setRows([]));
  }, [refresh]);

  async function simulate() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/economics/revenue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-actor-ref": actorRef,
        },
        body: JSON.stringify({
          grossUnits: "1000000",
          asset: "USDC",
          scale: 6,
          saleId: `sale:${crypto.randomUUID()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? copy.error);
      setNotice(
        `${copy.gross} ${formatAmount(data.value.gross)} · ${copy.protocolFee} ${formatAmount(data.value.fees[0].amount)} · ${copy.net} ${formatAmount(data.value.net)}`
      );
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : copy.error);
    } finally {
      setBusy(false);
    }
  }

  async function settle(entitlementId: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/economics/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-actor-ref": actorRef,
        },
        body: JSON.stringify({ entitlementId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? copy.error);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-border/60 bg-background/40 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">{copy.ledgerTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-foreground/60">{copy.ledgerHint}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={simulate}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {copy.simulateRevenue}
        </button>
      </div>
      {notice ? <p className="mb-3 text-sm text-foreground/70">{notice}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-foreground/50">{copy.emptyLedger}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.entitlementId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
            >
              <span>
                {formatAmount(row.amount)} · {executionLabel(copy, row)}
              </span>
              {row.status === "accrued" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => settle(row.entitlementId)}
                  className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-60"
                >
                  {copy.settle}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
