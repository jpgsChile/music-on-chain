"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { decimalToUnits, unitsToDecimal } from "@/lib/domain/fanEconomy/display";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { StudioEmptyState, StudioLoading, StudioPageHeader } from "@/components/studio/StudioStates";
import TestnetProof from "@/components/fan-economy/TestnetProof";
import { EvidenceBody } from "@/components/fan-economy/EvidenceBody";
import { releaseCoverSrc } from "@/lib/release/coverUrl";

type Money = { units: string; scale: number; asset: string };

type Participant = { name: string | null; shareBps: number };

type FanView = {
  purchasingPower: Money[];
  missions: {
    id: string;
    title: string;
    criterion: string;
    campaignTitle: string;
    artistName: string | null;
    maximumReward: Money;
  }[];
  assignments: {
    id: string;
    state: string;
    missionTitle: string;
    evidenceIds: string[];
    evidenceText: string | null;
    reward: {
      id: string;
      remaining: Money;
      authorized: Money;
      asset: string;
      scale: number;
    } | null;
  }[];
  redemptions: {
    redemptionId: string;
    releaseTitle: string | null;
    amount: Money;
    state: string;
    participants: Participant[];
  }[];
  targets: { id: string; title: string; coverUrl: string | null; artistName: string | null }[];
};

function dollars(units: string, scale: number) {
  return `$${unitsToDecimal(units, scale)}`;
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/fan-economy", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.ok) throw new Error("failed");
  return json;
}

export default function SupportMusic() {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const [desk, setDesk] = useState<FanView | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState(false);
  const [statement, setStatement] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [justSupported, setJustSupported] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/fan-economy", {
      credentials: "include",
      signal: AbortSignal.timeout(8000),
    });
    const json = await response.json();
    if (!json.ok || !Array.isArray(json.purchasingPower)) throw new Error("failed");
    setDesk(json);
    setReleaseId((current) => current || json.targets?.[0]?.id || "");
    setPhase("ready");
  }, []);

  useEffect(() => {
    let active = true;
    load().catch(() => {
      if (active) setPhase("error");
    });
    return () => {
      active = false;
    };
  }, [load]);

  async function run(body: Record<string, unknown>) {
    setError(false);
    try {
      await post(body);
      await load();
    } catch {
      setError(true);
    }
  }

  async function onEvidence(event: FormEvent, assignmentId: string) {
    event.preventDefault();
    await run({ command: "submitEvidence", assignmentId, statement });
    setStatement("");
  }

  async function onRedeem(event: FormEvent, reward: NonNullable<FanView["assignments"][number]["reward"]>) {
    event.preventDefault();
    const units = amount.trim() ? decimalToUnits(amount, reward.scale) : BigInt(reward.remaining.units);
    if (units <= 0n || units > BigInt(reward.remaining.units)) {
      setError(true);
      return;
    }
    const redemptionId = `redeem-${crypto.randomUUID().slice(0, 12)}`;
    await run({
      command: "redeemReward",
      rewardEntitlementId: reward.id,
      releaseId,
      units: units.toString(),
      scale: reward.scale,
      asset: reward.asset,
      redemptionId,
    });
    setJustSupported(redemptionId);
    setAmount("");
  }

  const power = desk?.purchasingPower[0] ?? null;
  const earned = desk?.assignments.find((assignment) => assignment.reward && assignment.reward.remaining.units !== "0");
  const highlighted = desk?.redemptions.find((row) => row.redemptionId === justSupported) ?? desk?.redemptions.at(-1);
  const selected = desk?.targets.find((target) => target.id === releaseId) ?? null;
  const supportLabel = earned
    ? `${t.supportWith} ${amount.trim() ? `$${amount.trim()}` : dollars(earned.reward!.remaining.units, earned.reward!.scale)}`
    : t.redeem;
  const hasAssignments = (desk?.assignments.length ?? 0) > 0;

  return (
    <div>
      <StudioPageHeader eyebrow={t.fanEyebrow} title={t.fanTitle} subtitle={t.fanSubtitle} />
      <TestnetProof story="fan" />
      {phase === "loading" ? <StudioLoading label={t.fanEyebrow} /> : null}
      {phase === "error" || error ? <p className="mb-4 text-sm text-red-400">{t.failed}</p> : null}

      <section className="mb-8 rounded-2xl border border-accent/40 bg-accent/10 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-foreground/55">{t.available}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight">
          {power ? dollars(power.units, power.scale) : "$0"}
        </p>
        {!power ? <p className="mt-2 text-sm text-foreground/60">{t.emptyPower}</p> : null}
      </section>

      {earned?.reward ? (
        <section className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-lg font-semibold text-emerald-300">{t.rewardEarned}</p>
          <p className="mt-1 text-2xl font-semibold">
            {dollars(earned.reward.authorized.units, earned.reward.authorized.scale)}
          </p>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-foreground/55">{t.missionsAvailable}</h2>
        {phase !== "ready" || !desk ? null : desk.missions.length === 0 ? (
          <StudioEmptyState
            title={hasAssignments ? t.emptyMissionsAccepted : t.emptyMissions}
            description={t.fanSubtitle}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {desk.missions.map((mission) => (
              <li key={mission.id} className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-wide text-foreground/45">{mission.artistName ?? t.artist}</p>
                <p className="mt-1 text-lg font-semibold">{mission.title}</p>
                <p className="mt-2 text-sm text-foreground/65">
                  {t.requiredAction}: {mission.criterion}
                </p>
                <p className="mt-3 text-sm font-medium">{dollars(mission.maximumReward.units, mission.maximumReward.scale)}</p>
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
                  onClick={() => run({ command: "acceptMission", missionId: mission.id })}
                >
                  {t.participate}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasAssignments ? (
        <section className="mb-8 space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-foreground/55">{t.myMissions}</h2>
          {desk?.assignments.map((assignment) => (
            <article key={assignment.id} className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="font-medium">{assignment.missionTitle}</p>
              {assignment.state === "active" ? (
                <>
                  <p className="mt-2 text-sm text-foreground/65">{t.sendEvidenceHint}</p>
                  <form onSubmit={(event) => onEvidence(event, assignment.id)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      aria-label={t.evidence}
                      placeholder={t.evidence}
                      value={statement}
                      onChange={(event) => setStatement(event.target.value)}
                      required
                    />
                    <button className="rounded-lg border border-border px-3 py-2 text-sm" type="submit">
                      {t.sendEvidence}
                    </button>
                  </form>
                </>
              ) : null}
              {assignment.state === "evidence-submitted" ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground/90">{t.evidenceSubmitted}</p>
                  <p className="text-foreground/60">{t.evidenceAwaitingReview}</p>
                  {assignment.evidenceText ? (
                    <div className="mt-2">
                      <p className="text-xs uppercase tracking-wide text-foreground/45">{t.evidence}</p>
                      <EvidenceBody text={assignment.evidenceText} openLabel={t.openEvidenceLink} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {assignment.state === "verified" && !assignment.reward ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground/90">{t.participationVerified}</p>
                  <p className="text-foreground/60">{t.awaitingRewardAuthorization}</p>
                </div>
              ) : null}
              {assignment.state === "rejected" ? (
                <p className="mt-3 text-sm text-foreground/60">{t.stateRejected}</p>
              ) : null}
              {assignment.reward ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-medium text-emerald-300">{t.rewardEarned}</p>
                  <p className="text-lg font-semibold">
                    {dollars(assignment.reward.authorized.units, assignment.reward.authorized.scale)}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {earned?.reward ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-foreground/55">{t.chooseRelease}</h2>
          {!desk || desk.targets.length === 0 ? (
            <p className="text-sm text-foreground/60">{t.noReleases}</p>
          ) : (
            <form onSubmit={(event) => onRedeem(event, earned.reward!)} className="grid gap-3 md:grid-cols-2">
              {desk.targets.map((target) => (
                <label
                  key={target.id}
                  className={`cursor-pointer rounded-2xl border p-4 ${target.id === releaseId ? "border-accent" : "border-border"}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="release"
                    checked={target.id === releaseId}
                    onChange={() => setReleaseId(target.id)}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={releaseCoverSrc(target.coverUrl)}
                    alt=""
                    className="mb-3 h-36 w-full rounded-xl object-cover bg-border/30"
                  />
                  <p className="font-semibold">{target.title}</p>
                  <p className="text-sm text-foreground/60">{target.artistName ?? t.artist}</p>
                </label>
              ))}
              <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-40"
                  aria-label={t.amount}
                  placeholder={t.amount}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background" type="submit" disabled={!releaseId}>
                  {supportLabel}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      {highlighted && highlighted.state !== "reversed" ? (
        <section className="mt-8 rounded-2xl border border-border bg-background/80 p-5">
          <h2 className="text-lg font-semibold">{t.supportedRelease}</h2>
          <p className="mt-1 text-sm text-foreground/65">{t.supportGenerates}</p>
          <ol className="mt-5 space-y-2 text-sm">
            <li className="rounded-xl bg-border/20 px-4 py-3">
              {t.yourReward}
              <span className="mt-1 block text-lg font-semibold">{dollars(highlighted.amount.units, highlighted.amount.scale)}</span>
            </li>
            <li className="px-4 text-foreground/40" aria-hidden>
              ↓
            </li>
            <li className="rounded-xl bg-border/20 px-4 py-3">
              {t.releaseStep}
              <span className="mt-1 block font-semibold">{highlighted.releaseTitle ?? selected?.title}</span>
            </li>
            <li className="px-4 text-foreground/40" aria-hidden>
              ↓
            </li>
            <li className="rounded-xl bg-border/20 px-4 py-3">
              {t.participantsStep}
              <ul className="mt-2 space-y-1">
                {highlighted.participants.map((participant, index) => (
                  <li key={`${participant.name ?? "participant"}-${index}`}>
                    {participant.name ?? t.participants}
                    {typeof participant.shareBps === "number" ? ` · ${participant.shareBps / 100}%` : ""}
                  </li>
                ))}
              </ul>
            </li>
          </ol>
          <TrustProof redemptionId={highlighted.redemptionId} />
        </section>
      ) : null}
    </div>
  );
}

function TrustProof({ redemptionId }: { redemptionId: string }) {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const [proof, setProof] = useState<Record<string, string> | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || loaded) return;
    const response = await fetch(`/api/fan-economy?view=trust&redemptionId=${encodeURIComponent(redemptionId)}`, {
      credentials: "include",
    });
    const json = await response.json();
    if (!json.ok || !json.proof?.published) {
      setProof(null);
      setLoaded(true);
      return;
    }
    const value = json.proof as Record<string, string | null>;
    const shown: Record<string, string> = {};
    for (const key of ["network", "contractId", "status", "actorHash", "redemptionId", "distributionHash"]) {
      if (typeof value[key] === "string" && value[key]) shown[key] = value[key] as string;
    }
    setProof(shown);
    setLoaded(true);
  }

  return (
    <div className="mt-4">
      <button type="button" className="text-sm text-foreground/60 underline" onClick={toggle}>
        {t.redemptionProofToggle}
      </button>
      {open ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-foreground/90">{t.redemptionEconomicRecord}</p>
          {proof && Object.keys(proof).length > 0 ? (
            <dl className="space-y-1 text-xs text-foreground/70">
              {Object.entries(proof).map(([key, value]) => (
                <div key={key}>
                  <dt className="inline text-foreground/45">{key}: </dt>
                  <dd className="inline break-all">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-foreground/60">{t.redemptionOnChainPending}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
