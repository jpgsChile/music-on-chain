"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import { isOnChainReceipt, isSimulatedMockReceipt } from "@/lib/domain/economics/execution/semantics";

type LedgerCopy = {
  ledgerTitle: string;
  ledgerHint: string;
  emptyLedger: string;
  emptyMovements: string;
  emptySplit: string;
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
  participantCatalogHint: string;
  originLabel: string;
  splitTitle: string;
  revenueTitle: string;
  entitlementsTitle: string;
  balanceAccrued: string;
  balanceSettled: string;
  noBalance: string;
  assetLabel: string;
  withdrawSoon: string;
  beneficiaryLabel: string;
  roleOwner: string;
  roleParticipant: string;
  roleBeneficiary: string;
  ownerCaption: string;
};

type ParticipationWire = {
  id: string;
  displayName: string;
  role: string;
  revenueSharePercent: number;
  actorRef: string | null;
};

type CatalogRelease = {
  id: string;
  title: string;
  workId: string;
  work?: { title?: string } | null;
  actorRef: string;
  catalogRole: "owner" | "participant";
  ownerDisplayName: string | null;
  participations: ParticipationWire[];
};

type MoneyWire = { units: string; scale: number; asset: string };

type EntitlementWire = {
  entitlementId: string;
  actorRef: string;
  revenueId: string;
  workId?: string | null;
  releaseId?: string | null;
  status: string;
  shareBps: number;
  amount: MoneyWire;
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

type RevenueWire = {
  revenueId: string;
  workId: string | null;
  releaseId: string | null;
  ruleId: string;
  gross: MoneyWire;
  net: MoneyWire;
  fees: { kind: string; bps: number; amount: MoneyWire }[];
};

function formatAmount(amount: MoneyWire) {
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
  const [revenues, setRevenues] = useState<RevenueWire[]>([]);
  const [catalog, setCatalog] = useState<CatalogRelease[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = catalog.find((row) => row.id === selectedReleaseId) ?? null;
  const isOwner = selected?.catalogRole === "owner";
  const ownedCount = catalog.filter((row) => row.catalogRole === "owner").length;

  const refresh = useCallback(async () => {
    const [releasesRes, partsRes] = await Promise.all([
      fetch("/api/releases", { credentials: "include" }),
      fetch("/api/participations", { credentials: "include" }),
    ]);
    const releasesData = await releasesRes.json().catch(() => ({}));
    const partsData = await partsRes.json().catch(() => ({}));
    const owned = Array.isArray(releasesData.value) ? releasesData.value : [];
    const parts = Array.isArray(partsData.value) ? partsData.value : [];
    const byId = new Map<string, CatalogRelease>();
    for (const row of owned) {
      byId.set(row.id, {
        id: row.id,
        title: row.title,
        workId: row.workId,
        work: row.work,
        actorRef: row.actorRef,
        catalogRole: "owner",
        ownerDisplayName: null,
        participations: Array.isArray(row.participations) ? row.participations : [],
      });
    }
    for (const row of parts) {
      const release = row.release;
      if (!release?.id) continue;
      const existing = byId.get(release.id);
      if (existing) continue;
      if (row.actorRef !== actorRef) continue;
      byId.set(release.id, {
        id: release.id,
        title: release.title,
        workId: release.workId,
        work: release.work,
        actorRef: release.actorRef,
        catalogRole: "participant",
        ownerDisplayName: release.ownerDisplayName ?? null,
        participations: [
          {
            id: row.id,
            displayName: row.displayName,
            role: row.role,
            revenueSharePercent: row.revenueSharePercent,
            actorRef: row.actorRef,
          },
        ],
      });
    }
    const next = [...byId.values()];
    setCatalog(next);
    setSelectedReleaseId((current) => {
      if (current && next.some((row) => row.id === current)) return current;
      return "";
    });
  }, [actorRef]);

  const refreshLedger = useCallback(async (releaseId: string) => {
    if (!releaseId) {
      setRows([]);
      setRevenues([]);
      return;
    }
    const entitlementsRes = await fetch(
      `/api/economics/entitlements?releaseId=${encodeURIComponent(releaseId)}`,
      { credentials: "include" }
    );
    const entitlementsData = await entitlementsRes.json().catch(() => ({}));
    setRows(Array.isArray(entitlementsData.value) ? entitlementsData.value : []);
    setRevenues(Array.isArray(entitlementsData.revenues) ? entitlementsData.revenues : []);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setCatalog([]);
    });
  }, [refresh]);

  useEffect(() => {
    refreshLedger(selectedReleaseId).catch(() => {
      setRows([]);
      setRevenues([]);
    });
  }, [selectedReleaseId, refreshLedger]);

  const nameByActor = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of selected?.participations ?? []) {
      if (row.actorRef) map.set(row.actorRef, row.displayName);
    }
    return map;
  }, [selected]);

  const balances = useMemo(() => {
    const byActor = new Map<string, { accrued: number; settled: number; asset: string; scale: number }>();
    for (const row of rows) {
      const current = byActor.get(row.actorRef) ?? {
        accrued: 0,
        settled: 0,
        asset: row.amount.asset,
        scale: row.amount.scale,
      };
      const units = Number(row.amount.units);
      if (row.status === "settled") current.settled += units;
      else current.accrued += units;
      byActor.set(row.actorRef, current);
    }
    return byActor;
  }, [rows]);

  async function simulate() {
    if (!selected || selected.catalogRole !== "owner") return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/economics/revenue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
      await refreshLedger(selected.id);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entitlementId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? copy.error);
      await refreshLedger(selectedReleaseId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : copy.error);
    } finally {
      setBusy(false);
    }
  }

  const canSimulate = Boolean(selected && isOwner) && !busy;
  const split = selected?.participations ?? [];
  const emptyHint =
    catalog.length === 0
      ? copy.noCatalog
      : ownedCount === 0
        ? copy.participantCatalogHint
        : copy.selectReleaseHint;

  return (
    <section className="mb-8 space-y-6 rounded-xl border border-border/60 bg-background/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">{copy.ledgerTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-foreground/60">{copy.ledgerHint}</p>
          <p className="mt-1 text-xs text-foreground/45">{copy.assetLabel}</p>
        </div>
        {isOwner ? (
          <button
            type="button"
            disabled={!canSimulate}
            onClick={() => void simulate()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {copy.simulateRevenue}
          </button>
        ) : null}
      </div>

      {catalog.length === 0 ? (
        <p className="text-sm text-foreground/50">{copy.noCatalog}</p>
      ) : (
        <label className="block text-sm text-foreground/70">
          <span className="mb-1 block font-medium text-foreground">{copy.selectRelease}</span>
          <span className="mb-2 block text-xs text-foreground/50">{emptyHint}</span>
          <select
            className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={selectedReleaseId}
            onChange={(event) => setSelectedReleaseId(event.target.value)}
          >
            <option value="">{copy.selectRelease}</option>
            {catalog.map((row) => (
              <option key={row.id} value={row.id}>
                {(row.work?.title || row.title) +
                  " · " +
                  row.title +
                  " · " +
                  (row.catalogRole === "owner" ? copy.roleOwner : copy.roleParticipant)}
              </option>
            ))}
          </select>
        </label>
      )}

      {notice ? <p className="text-sm text-foreground/70">{notice}</p> : null}

      {!selected ? (
        catalog.length > 0 ? <p className="text-sm text-foreground/50">{emptyHint}</p> : null
      ) : (
        <>
          <p className="text-sm text-foreground/70">
            {isOwner ? copy.roleOwner : copy.roleParticipant}
            {!isOwner && selected.ownerDisplayName
              ? ` · ${copy.ownerCaption} ${selected.ownerDisplayName}`
              : null}
          </p>
          <div>
            <h3 className="mb-2 text-sm font-medium">{copy.splitTitle}</h3>
            {split.length === 0 ? (
              <p className="text-sm text-foreground/50">{copy.emptySplit}</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {split.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      {row.displayName}
                      <span className="mt-0.5 block text-xs text-foreground/45">{row.role}</span>
                    </span>
                    <span className="font-mono">{row.revenueSharePercent}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">{copy.revenueTitle}</h3>
            {revenues.length === 0 ? (
              <p className="text-sm text-foreground/50">{copy.emptyMovements}</p>
            ) : (
              <ul className="space-y-2">
                {revenues.map((row) => {
                  const protocol = row.fees.find((fee) => fee.kind === "protocol");
                  return (
                    <li key={row.revenueId} className="rounded-lg border border-border/40 px-3 py-2 text-sm">
                      <p>
                        {copy.originLabel} {selected.work?.title || selected.title} · {selected.title}
                      </p>
                      <p className="mt-1 text-foreground/70">
                        {copy.gross} {formatAmount(row.gross)} · {copy.protocolFee}{" "}
                        {protocol ? formatAmount(protocol.amount) : "—"} · {copy.net} {formatAmount(row.net)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              {isOwner ? copy.entitlementsTitle : copy.roleBeneficiary}
            </h3>
            {rows.length === 0 ? (
              <p className="text-sm text-foreground/50">{copy.emptyLedger}</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => {
                  const receipt = row.execution?.receipt;
                  const simulated = receipt ? isSimulatedMockReceipt(receipt) : false;
                  const onChain = receipt ? isOnChainReceipt(receipt) : false;
                  const name = nameByActor.get(row.actorRef) ?? copy.beneficiaryLabel;
                  const percent = row.shareBps / 100;
                  return (
                    <li
                      key={row.entitlementId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
                    >
                      <span>
                        {name} · {percent}% · {formatAmount(row.amount)} · {executionLabel(copy, row)}
                        {row.execution?.intentRef ? (
                          <span className="mt-1 block text-xs text-foreground/45">
                            {copy.execIntent} {shortenRef(row.execution.intentRef)}
                          </span>
                        ) : null}
                        {receipt?.externalRef && onChain && !simulated ? (
                          <span className="block break-all text-xs text-foreground/45">
                            {copy.execReference} {receipt.externalRef}
                          </span>
                        ) : null}
                      </span>
                      {row.status === "accrued" && row.actorRef === actorRef ? (
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
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">{copy.balanceAccrued}</h3>
            {split.length === 0 ? (
              <p className="text-sm text-foreground/50">{copy.noBalance}</p>
            ) : (
              <ul className="space-y-2">
                {split.map((row) => {
                  const ledger = row.actorRef ? balances.get(row.actorRef) : undefined;
                  const scale = ledger?.scale ?? 6;
                  const asset = ledger?.asset ?? "USDC";
                  const accrued = ledger ? ledger.accrued / 10 ** scale : 0;
                  const settledAmt = ledger ? ledger.settled / 10 ** scale : 0;
                  return (
                    <li key={row.id} className="rounded-lg border border-border/40 px-3 py-2 text-sm">
                      <p>
                        {row.displayName} · {row.revenueSharePercent}%
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {copy.balanceAccrued}: {accrued.toFixed(2)} {asset} · {copy.balanceSettled}:{" "}
                        {settledAmt.toFixed(2)} {asset}
                      </p>
                      <p className="mt-1 text-xs text-foreground/40">{copy.withdrawSoon}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
