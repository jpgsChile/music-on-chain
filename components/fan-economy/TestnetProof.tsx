"use client";

import { useState } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

type Proof = {
  published: boolean;
  network?: string;
  contractId?: string;
  contractUrl?: string;
  artist?: { actorRef: string; actorHash: string; capability: string | null };
  fan?: { actorRef: string; actorHash: string; capability: string | null };
  campaign?: { committed: string; outstanding: string; scale: number } | null;
  reward?: { authorized: string; consumed: string; released: string; remaining: string; actorHash: string } | null;
  redemption?: {
    amount: string;
    status: "committed" | "locked" | "reversed";
    targetHash: string;
    distributionHash: string;
    materializationHash: string | null;
  } | null;
  transactions?: { hash: string; url: string }[];
};

export default function TestnetProof({ story }: { story: "artist" | "fan" }) {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const [open, setOpen] = useState(false);
  const [technical, setTechnical] = useState(false);
  const [proof, setProof] = useState<Proof | null>(null);
  const [proofPhase, setProofPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || proof || proofPhase === "loading") return;
    setProofPhase("loading");
    try {
      const response = await fetch("/api/fan-economy?view=testnet-proof", {
        credentials: "include",
        signal: AbortSignal.timeout(20000),
      });
      const json = await response.json();
      setProof(json.ok ? json.proof : { published: false });
      setProofPhase("ready");
    } catch {
      setProof({ published: false });
      setProofPhase("error");
    }
  }

  const steps = story === "artist" ? t.artistStory : t.fanStory;
  const statusLabel = proof?.redemption
    ? proof.redemption.status === "locked"
      ? t.statusLocked
      : proof.redemption.status === "reversed"
        ? t.statusReversed
        : t.statusCommitted
    : null;

  return (
    <section className="mt-8 rounded-2xl border border-border p-5">
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step} className="rounded-xl bg-border/20 px-3 py-2 text-sm">
            <span className="mr-2 text-foreground/40">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <button type="button" className="mt-4 text-sm text-foreground/70 underline" onClick={toggle}>
        {t.trustToggle}
      </button>
      {open && proofPhase === "loading" ? <p className="mt-3 text-sm text-foreground/60">{t.trustToggle}</p> : null}
      {open && proofPhase !== "loading" ? (
        !proof?.published || !proof.redemption ? (
          <p className="mt-3 text-sm text-foreground/60">{t.trustPending}</p>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-lg font-semibold">{statusLabel}</p>
            <p className="text-foreground/60">{t.capabilityNote}</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Item label={t.networkLabel} value={t.stellarTestnet} />
              <Item label={t.committed} value={proof.campaign?.committed ?? "—"} />
              <Item label={t.standing} value={proof.campaign?.outstanding ?? "—"} />
              <Item label={t.rewardsAuthorized} value={proof.reward?.authorized ?? "—"} />
            </dl>
            {proof.contractUrl ? (
              <a className="inline-block text-accent underline" href={proof.contractUrl} target="_blank" rel="noreferrer">
                {t.viewContract}
              </a>
            ) : null}
            {proof.transactions && proof.transactions.length > 0 ? (
              <ul className="space-y-1">
                {proof.transactions.map((tx) => (
                  <li key={tx.hash}>
                    <a className="break-all text-accent underline" href={tx.url} target="_blank" rel="noreferrer">
                      {tx.hash}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="text-foreground/60 underline" onClick={() => setTechnical((value) => !value)}>
              {t.technicalView}
            </button>
            {technical ? (
              <dl className="space-y-1 text-xs text-foreground/70">
                <Item label={t.identityActor} value={proof.fan?.actorRef ?? ""} />
                <Item label={t.identityHash} value={proof.fan?.actorHash ?? ""} />
                <Item label={t.identityCapability} value={proof.fan?.capability ?? ""} />
                <Item label={t.identityContract} value={proof.contractId ?? ""} />
                <Item label={t.artist} value={proof.artist?.actorRef ?? ""} />
                <Item label="ActorHash" value={proof.artist?.actorHash ?? ""} />
                <Item label={t.identityCapability} value={proof.artist?.capability ?? ""} />
                <Item label="amount" value={proof.redemption.amount} />
                <Item label="status" value={proof.redemption.status} />
                <Item label="target" value={proof.redemption.targetHash} />
                <Item label="distributionHash" value={proof.redemption.distributionHash} />
                <Item label="materialization" value={proof.redemption.materializationHash ?? t.materializationEmpty} />
                <Item label="authorized" value={proof.reward?.authorized ?? ""} />
                <Item label="consumed" value={proof.reward?.consumed ?? ""} />
                <Item label="released" value={proof.reward?.released ?? ""} />
                <Item label="remaining" value={proof.reward?.remaining ?? ""} />
              </dl>
            ) : null}
          </div>
        )
      ) : null}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-foreground/45">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
