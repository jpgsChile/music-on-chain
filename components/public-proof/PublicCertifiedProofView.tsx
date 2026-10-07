import CopyValue from "@/components/public-proof/CopyValue";
import type { CertifiedHackathonProof } from "@/lib/fan-economy/public-proof/certifiedHackathonProof";
import { shortenRef } from "@/lib/fan-economy/materialization/presentation";
import { getTranslations, type Language } from "@/lib/i18n";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-foreground/45">{label}</dt>
      <dd className="mt-1 break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}

function HashRow({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-foreground/45">{label}</dt>
      <dd className="mt-1 flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground/80" title={value}>
          {shortenRef(value, 10, 8)}
        </code>
        <CopyValue value={value} copyLabel={copyLabel} copiedLabel={copiedLabel} />
      </dd>
    </div>
  );
}

/** Read-only receipt. It does not fetch, poll, or accept a redemption id. */
export default function PublicCertifiedProofView({
  locale,
  proof,
}: {
  locale: Language;
  proof: CertifiedHackathonProof;
}) {
  const t = getTranslations(locale).publicProof;

  if (
    !proof.available ||
    proof.persistedVerification !== "verified" ||
    !proof.commitments ||
    !proof.transactionHash ||
    !proof.contractId ||
    proof.ledger == null
  ) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">{t.brand}</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">{t.unavailableTitle}</h1>
        <p className="mt-4 text-foreground/70">{t.unavailableBody}</p>
      </main>
    );
  }

  const statusLabel =
    proof.economicStatus === "accrued" ? t.accruedNotSettled : proof.economicStatus === "settled" ? t.settled : t.recorded;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">{t.brand}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t.title}</h1>
        <span className="rounded-full border border-accent/40 px-2.5 py-1 text-xs font-semibold tracking-wide text-accent">
          {t.testnetBadge}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground/80">{t.network}</p>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-foreground/75">{t.explanation}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-border bg-background/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/55">{t.fanPerspective}</h2>
          <dl className="mt-4 grid gap-4">
            <Field label={t.release} value={proof.releaseTitle} />
            <Field label={t.support} value={proof.support.label} />
            <Field label={t.economicRecord} value={t.economicCreated} />
            <Field label={t.stellarEvidence} value={t.verifiedOnTestnet} />
            <Field label={t.protocol} value={t.locked} />
            <Field label={t.ledger} value={String(proof.ledger)} />
          </dl>
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-background/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/55">{t.artistPerspective}</h2>
          <dl className="mt-4 grid gap-4">
            <Field label={t.release} value={proof.releaseTitle} />
            <Field label={t.origin} value={t.originFanSupport} />
            <Field label={t.gross} value={proof.gross.label} />
            <Field label={t.artistParticipation} value={proof.artistParticipation.label} />
            <Field label={t.economicStatus} value={statusLabel} />
            <Field label={t.stellarEvidence} value={t.verifiedOnTestnet} />
          </dl>
          <p className="mt-4 text-sm text-foreground/60">{t.notSettlement}</p>
        </section>
      </div>

      <section className="mt-4 min-w-0 rounded-2xl border border-border p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/55">{t.sameOperation}</h2>
        <p className="mt-1 text-sm text-foreground/70">{t.sameEvidence}</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.network} value={t.network} />
          <Field label={t.protocolState} value={t.locked} />
          <Field label={t.ledger} value={String(proof.ledger)} />
          <HashRow label={t.contract} value={proof.contractId} copyLabel={t.copy} copiedLabel={t.copied} />
          <HashRow label={t.transaction} value={proof.transactionHash} copyLabel={t.copy} copiedLabel={t.copied} />
          <HashRow
            label={t.materializationCommitment}
            value={proof.commitments.materialization}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
        </dl>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {proof.transactionUrl ? (
            <a
              href={proof.transactionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-background hover:bg-accent-hover"
            >
              {t.viewTransaction}
            </a>
          ) : null}
          {proof.contractUrl ? (
            <a
              href={proof.contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-border/30"
            >
              {t.viewContract}
            </a>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-foreground/70">
          {proof.liveNetworkStatus === "confirmed" ? t.liveConfirmed : t.liveUnavailable}
        </p>
        {proof.liveNetworkStatus === "unavailable" ? <p className="mt-1 text-sm text-foreground/80">{t.verifiedRecorded}</p> : null}
      </section>

      <section className="mt-4 rounded-2xl border border-border p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/55">{t.provenanceTitle}</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-foreground/45">{t.provenanceEconomic}</dt>
            <dd className="text-foreground">{t.provenanceEconomicSource}</dd>
          </div>
          <div>
            <dt className="text-foreground/45">{t.provenanceStellar}</dt>
            <dd className="text-foreground">{t.provenanceStellarSource}</dd>
          </div>
          <div>
            <dt className="text-foreground/45">{t.provenanceLive}</dt>
            <dd className="text-foreground">{t.provenanceLiveSource}</dd>
          </div>
        </dl>
      </section>

      <details className="mt-4 rounded-2xl border border-border p-5">
        <summary className="cursor-pointer text-sm font-medium text-foreground">{t.technicalDetails}</summary>
        <dl className="mt-4 grid gap-4">
          <HashRow label={t.redemptionCommitment} value={proof.commitments.redemption} copyLabel={t.copy} copiedLabel={t.copied} />
          <HashRow label={t.revenueCommitment} value={proof.commitments.revenue} copyLabel={t.copy} copiedLabel={t.copied} />
          <HashRow label={t.distributionCommitment} value={proof.commitments.distribution} copyLabel={t.copy} copiedLabel={t.copied} />
          <HashRow
            label={t.materializationCommitment}
            value={proof.commitments.materialization}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
          <HashRow label={t.transaction} value={proof.transactionHash} copyLabel={t.copy} copiedLabel={t.copied} />
          <HashRow label={t.contract} value={proof.contractId} copyLabel={t.copy} copiedLabel={t.copied} />
        </dl>
      </details>
    </main>
  );
}
