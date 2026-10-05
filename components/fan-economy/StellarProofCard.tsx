"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/domain/fanEconomy/display";
import {
  proofExperience,
  shortenRef,
  stellarExpertContractUrl,
  stellarExpertTransactionUrl,
  type ProofExperience,
  type PublicationProof,
} from "@/lib/fan-economy/materialization/presentation";
import type { ProofCommitments, ProofSubject } from "@/lib/fan-economy/materialization/proofCard";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

type CardModel = {
  proof: PublicationProof | null;
  subject: ProofSubject | null;
  commitments: ProofCommitments | null;
};

const HASH = /^[0-9a-f]{64}$/i;

function hex(value: string | null | undefined): string | null {
  return value && HASH.test(value) ? value.toLowerCase() : null;
}

function parseCard(json: unknown): CardModel {
  const record = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const proof = record.proof && typeof record.proof === "object" ? (record.proof as PublicationProof) : null;
  const subject = record.subject && typeof record.subject === "object" ? (record.subject as ProofSubject) : null;
  const raw = record.commitments && typeof record.commitments === "object" ? (record.commitments as ProofCommitments) : null;
  const commitments = raw
    ? {
        redemption: hex(raw.redemption) ?? "",
        revenue: hex(raw.revenue) ?? "",
        distribution: hex(raw.distribution) ?? "",
        materialization: hex(raw.materialization) ?? "",
      }
    : null;
  if (!proof?.economicRecord) return { proof: null, subject: null, commitments: null };
  return { proof, subject, commitments };
}

async function loadCard(redemptionId: string): Promise<CardModel> {
  const response = await fetch(`/api/fan-economy?view=materialization&redemptionId=${encodeURIComponent(redemptionId)}`, {
    credentials: "include",
  });
  return parseCard(await response.json());
}

/** Proof for one canonical redemption. Chain fields come only from the materialization view. */
export default function StellarProofCard({ redemptionId }: { redemptionId: string }) {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const [model, setModel] = useState<CardModel | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function tick() {
      try {
        const next = await loadCard(redemptionId);
        if (!active) return;
        setModel(next);
        const experience = proofExperience(next.proof);
        if ((experience === "pending" || experience === "publishing" || experience === "recorded") && attempts < 8) {
          attempts += 1;
          timer = setTimeout(tick, 3000);
        }
      } catch {
        if (active) setModel({ proof: null, subject: null, commitments: null });
      }
    }

    tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [redemptionId]);

  async function retry() {
    setRetrying(true);
    try {
      await fetch("/api/fan-economy", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: "reconcileMaterialization", redemptionId }),
      });
      setModel(await loadCard(redemptionId));
    } finally {
      setRetrying(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setCopied(null);
    }
  }

  const proof = model?.proof ?? null;
  const experience: ProofExperience = proofExperience(proof);
  const verified = experience === "verified";
  const txUrl = verified ? stellarExpertTransactionUrl(proof?.network ?? null, proof?.transactionHash ?? null) : null;
  const contractUrl = verified ? stellarExpertContractUrl(proof?.network ?? null, proof?.contractId ?? null) : null;
  const headline =
    experience === "verified"
      ? t.stellarVerifiedHeadline
      : experience === "publishing"
        ? t.stellarPublishingHeadline
        : experience === "review"
          ? t.stellarReview
          : experience === "retryable"
            ? t.stellarRetryable
            : experience === "pending" || experience === "recorded"
              ? t.stellarPending
              : t.stellarPending;
  const commitments = model?.commitments;
  const details = verified
    ? [
        [t.redemptionCommitment, commitments?.redemption ?? ""],
        [t.revenueCommitment, commitments?.revenue ?? ""],
        [t.distributionCommitment, commitments?.distribution ?? ""],
        [t.materializationCommitment, commitments?.materialization ?? ""],
        [t.stellarTransaction, hex(proof?.transactionHash) ?? ""],
        [t.stellarContract, proof?.contractId ?? ""],
      ].filter((row) => row[1])
    : [];

  return (
    <div className="mt-3 space-y-2 text-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-foreground/45">{t.economicSection}</p>
      <p className="font-medium">✓ {t.stellarEconomicCheck}</p>
      <p className="text-xs uppercase tracking-[0.14em] text-foreground/45">{t.stellarEvidence}</p>
      <p className="font-medium">{verified ? `✓ ${headline}` : headline}</p>
      <p className="text-xs leading-5 text-foreground/60">{t.stellarExplanation}</p>
      {verified && proof ? (
        <dl className="grid gap-1 text-xs text-foreground/75 sm:grid-cols-2">
          {model?.subject ? (
            <div>
              <dt className="text-foreground/45">{t.supportAmount}</dt>
              <dd>{`$${formatMoney(model.subject.amount.units, model.subject.amount.scale, model.subject.amount.asset)}`}</dd>
            </div>
          ) : null}
          {model?.subject?.releaseTitle ? (
            <div>
              <dt className="text-foreground/45">{t.releaseStep}</dt>
              <dd>{model.subject.releaseTitle}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-foreground/45">{t.networkLabel}</dt>
            <dd>{t.stellarTestnet}</dd>
          </div>
          <div>
            <dt className="text-foreground/45">{t.stellarStatus}</dt>
            <dd>LOCKED</dd>
          </div>
          <div>
            <dt className="text-foreground/45">{t.stellarLedger}</dt>
            <dd>{proof.ledger}</dd>
          </div>
          <div>
            <dt className="text-foreground/45">{t.stellarTransaction}</dt>
            <dd>{shortenRef(proof.transactionHash ?? "", 8, 6)}</dd>
          </div>
        </dl>
      ) : null}
      {txUrl || contractUrl ? (
        <div className="flex flex-wrap gap-4">
          {txUrl ? (
            <a className="underline" href={txUrl} target="_blank" rel="noopener noreferrer">
              {t.viewTransaction}
            </a>
          ) : null}
          {contractUrl ? (
            <a className="underline" href={contractUrl} target="_blank" rel="noopener noreferrer">
              {t.viewContract}
            </a>
          ) : null}
        </div>
      ) : null}
      {experience === "retryable" ? (
        <button type="button" className="block text-sm text-foreground/70 underline" onClick={retry} disabled={retrying}>
          {retrying ? t.stellarPublishingHeadline : t.stellarRetry}
        </button>
      ) : null}
      {details.length > 0 ? (
        <details className="text-xs text-foreground/70">
          <summary className="cursor-pointer text-foreground/55">{t.technicalDetails}</summary>
          <dl className="mt-2 space-y-2">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-foreground/45">{label}</dt>
                <dd className="break-all font-mono">
                  {value}{" "}
                  <button type="button" className="underline" onClick={() => copy(value)}>
                    {copied === value ? t.copied : t.copyValue}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
