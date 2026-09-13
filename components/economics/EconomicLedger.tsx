"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import { isOnChainReceipt, isSimulatedMockReceipt } from "@/lib/domain/economics/execution/semantics";

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
  execSimulated: string;
  execFailed: string;
  execUnknown: string;
  execReference: string;
  execIntent: string;
  execLayerOffChain: string;
  execLayerOnChain: string;
  selectRelease: string;
  selectReleaseHint: string;
  noCatalog: string;
  originLabel: string;
};

type CatalogRelease = {
  id: string;
  title: string;
  workId: string;
  work?: { title?: string } | null;
};

type EntitlementWire = {
  entitlementId: string;
  actorRef: string;
  revenueId: string;
  workId?: string | null;
  releaseId?: string | null;
  status: string;
  shareBps: number;
  amount: { units: string; scale: number; asset: string };
  execution?: {
    intentRef: string;
    lifecycle: string;
    receipt?: {
      status?: string;
      executionMode?: string;
      externalRef?: string;
      metadata?: { adapter?: string; simulated?: boolean; onChain?: boolean };
    } | null;
  } | null;
};

function formatAmount(amount: { units: string; scale: number; asset: string }) {
  const value = Number(amount.units) / 10 ** amount.scale;
  return `${value.toFixed(2)} ${amount.asset}`;
}

function shortenRef(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function executionLabel(copy: LedgerCopy, row: EntitlementWire): string {
  const receipt = row.execution?.receipt;
  const status = receipt?.status ?? row.execution?.lifecycle;
  const simulated = receipt ? isSimulatedMockReceipt(receipt) : false;
  const onChain = receipt ? isOnChainReceipt(receipt) : false;
  if (row.status === "settled" || status === "CONFIRMED" || status === "confirmed") {
    if (simulated) return `${copy.execSimulated} · ${copy.execLayerOffChain}`;
    if (onChain) return `${copy.execConfirmed} · ${copy.execLayerOnChain}`;
    return copy.execSimulated;
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
  const [catalog, setCatalog] = useState<CatalogRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [entitlementsRes, releasesRes] = await Promise.all([
      fetch("/api/economics/entitlements", { credentials: "include" }),
      fetch("/api/releases", { credentials: "include" }),
    ]);
    const entitlementsData = await entitlementsRes.json().catch(() => ({}));
    const releasesData = await releasesRes.json().catch(() => ({}));
    setRows(Array.isArray(entitlementsData.value) ? entitlementsData.value : []);
    const releases: CatalogRelease[] = Array.isArray(releasesData.value) ? releasesData.value : [];
    setCatalog(releases);
    setSelectedReleaseId((current) => {
      if (current && releases.some((row) => row.id === current)) return current;
      return releases.length === 1 ? releases[0].id : "";
    });
  }, [actorRef]);

  useEffect(() => {
    refresh().catch(() => {
      setRows([]);
      setCatalog([]);
    });
  }, [refresh]);

  const selected = catalog.find((row) => row.id === selectedReleaseId) ?? null;

  async function simulate() {
    if (!selected) {
      setNotice(copy.noCatalog);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/economics/revenue", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grossUnits: "1000000",
          asset: "USDC",
          scale: 6,
          saleId: `sale:${crypto.randomUUID()}`,
          workId: selected.workId,
          releaseId: selected.id,
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
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
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

  const canSimulate = Boolean(selected) && !busy;

  return (
    <section className="mb-8 rounded-xl border border-border/60 bg-background/40 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">{copy.ledgerTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-foreground/60">{copy.ledgerHint}</p>
        </div>
        <button
          type="button"
          disabled={!canSimulate}
          onClick={() => void simulate()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {copy.simulateRevenue}
        </button>
      </div>
      {catalog.length === 0 ? (
        <p className="mb-3 text-sm text-foreground/50">{copy.noCatalog}</p>
      ) : (
        <label className="mb-3 block text-sm text-foreground/70">
          <span className="mb-1 block font-medium text-foreground">{copy.selectRelease}</span>
          <span className="mb-2 block text-xs text-foreground/50">{copy.selectReleaseHint}</span>
          <select
            className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={selectedReleaseId}
            onChange={(event) => setSelectedReleaseId(event.target.value)}
          >
            {catalog.length > 1 ? <option value="">{copy.selectRelease}</option> : null}
            {catalog.map((row) => (
              <option key={row.id} value={row.id}>
                {(row.work?.title || row.title) + " · " + row.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {notice ? <p className="mb-3 text-sm text-foreground/70">{notice}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-foreground/50">{copy.emptyLedger}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const receipt = row.execution?.receipt;
            const simulated = receipt ? isSimulatedMockReceipt(receipt) : false;
            const catalogMatch = catalog.find((item) => item.id === row.releaseId);
            const origin = catalogMatch
              ? `${copy.originLabel} ${catalogMatch.work?.title || catalogMatch.title}`
              : row.workId
                ? `${copy.originLabel} ${row.workId}`
                : null;
            return (
              <li
                key={row.entitlementId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <span>
                  {formatAmount(row.amount)} · {executionLabel(copy, row)}
                  {origin ? (
                    <span className="mt-1 block text-xs text-foreground/45">{origin}</span>
                  ) : null}
                  {row.execution?.intentRef ? (
                    <span className="mt-1 block text-xs text-foreground/45">
                      {copy.execIntent} {shortenRef(row.execution.intentRef)}
                    </span>
                  ) : null}
                  {receipt?.externalRef && !simulated ? (
                    <span className="block text-xs text-foreground/45">
                      {copy.execReference} {shortenRef(receipt.externalRef)}
                    </span>
                  ) : null}
                </span>
                {row.status === "accrued" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void settle(row.entitlementId)}
                    className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-60"
                  >
                    {copy.settle}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
