"use client";

import { useEffect, useState } from "react";
import { publicationPresentation, shortenRef, type PublicationProof } from "@/lib/fan-economy/materialization/presentation";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

/** Evidence for one canonical redemption. The server chooses the contract, the network, and the signer. */
export default function StellarEvidence({ redemptionId }: { redemptionId: string }) {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const [proof, setProof] = useState<PublicationProof | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProof() {
      const response = await fetch(`/api/fan-economy?view=materialization&redemptionId=${encodeURIComponent(redemptionId)}`, {
        credentials: "include",
      });
      const json = await response.json();
      if (!active) return;
      if (!json.ok || !json.proof?.economicRecord) {
        setProof(null);
        return;
      }
      setProof(json.proof as PublicationProof);
    }
    loadProof().catch(() => {
      if (active) setProof(null);
    });
    return () => {
      active = false;
    };
  }, [redemptionId]);

  async function reload() {
    const response = await fetch(`/api/fan-economy?view=materialization&redemptionId=${encodeURIComponent(redemptionId)}`, {
      credentials: "include",
    });
    const json = await response.json();
    if (!json.ok || !json.proof?.economicRecord) {
      setProof(null);
      return;
    }
    setProof(json.proof as PublicationProof);
  }

  async function retry() {
    setRetrying(true);
    try {
      await fetch("/api/fan-economy", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command: "reconcileMaterialization", redemptionId }),
      });
      await reload();
    } finally {
      setRetrying(false);
    }
  }

  const presentation = publicationPresentation(proof);
  const verified = presentation === "published";

  return (
    <div className="mt-3 space-y-2 text-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-foreground/45">{t.stellarEvidence}</p>
      <p className="font-medium">{verified ? t.stellarVerified : presentation === "publishing" ? t.stellarPublishing : presentation === "error" ? t.stellarFailed : t.stellarPending}</p>
      <p className="text-xs leading-5 text-foreground/60">{t.stellarExplanation}</p>
      {verified && proof?.transactionHash ? (
        <dl className="space-y-1 text-xs text-foreground/70">
          <div><dt className="inline text-foreground/45">{t.stellarObserved}</dt></div>
          <div><dt className="inline text-foreground/45">{t.networkLabel}: </dt><dd className="inline">{t.stellarTestnet}</dd></div>
          <div><dt className="inline text-foreground/45">{t.stellarStatus}: </dt><dd className="inline">LOCKED</dd></div>
          <div><dt className="inline text-foreground/45">{t.stellarContract}: </dt><dd className="inline">{shortenRef(proof.contractId, 4, 4)}</dd></div>
          <div><dt className="inline text-foreground/45">{t.stellarLedger}: </dt><dd className="inline">{proof.ledger}</dd></div>
          <div><dt className="inline text-foreground/45">{t.stellarTransaction}: </dt><dd className="inline break-all">{shortenRef(proof.transactionHash, 8, 6)}</dd></div>
          <div>
            <a className="underline" href={`https://stellar.expert/explorer/testnet/tx/${proof.transactionHash}`} target="_blank" rel="noreferrer">
              {t.stellarExplorer}
            </a>
          </div>
        </dl>
      ) : null}
      {presentation === "error" ? (
        <button type="button" className="text-sm text-foreground/70 underline" onClick={retry} disabled={retrying}>
          {retrying ? t.stellarPublishing : t.stellarRetry}
        </button>
      ) : null}
    </div>
  );
}
