"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { decimalToUnits, formatMoney, unitsToDecimal } from "@/lib/domain/fanEconomy/display";
import { groupSupportHistory } from "@/lib/fan-economy/supportHistory";
import { beginSupportIntent, supportSubmitAllowed, type SupportIntent } from "@/lib/fan-economy/supportIntent";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { StudioEmptyState, StudioLoading, StudioPageHeader } from "@/components/studio/StudioStates";
import TestnetProof from "@/components/fan-economy/TestnetProof";
import { EvidenceBody } from "@/components/fan-economy/EvidenceBody";
import { releaseCoverSrc } from "@/lib/release/coverUrl";
import StellarEvidence from "@/components/fan-economy/StellarEvidence";

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
    releaseId: string;
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

function supportMoney(money: Money) {
  return `$${formatMoney(money.units, money.scale, money.asset)}`;
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
  const [pendingSupport, setPendingSupport] = useState(false);
  const pendingSupportRef = useRef(false);
  const supportIntentRef = useRef<SupportIntent | null>(null);

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
    if (pendingSupportRef.current) return;
    let units: bigint;
    try {
      units = amount.trim() ? decimalToUnits(amount, reward.scale) : BigInt(reward.remaining.units);
    } catch {
      setError(true);
      return;
    }
    const allowed = supportSubmitAllowed({
      pending: false,
      releaseId,
      remainingUnits: BigInt(reward.remaining.units),
      amountUnits: units,
    });
    if (!allowed) {
      setError(true);
      return;
    }
    const intent = beginSupportIntent(
      supportIntentRef.current,
      { releaseId, units: units.toString() },
      () => `redeem-${crypto.randomUUID().slice(0, 12)}`
    );
    supportIntentRef.current = intent;
    pendingSupportRef.current = true;
    setPendingSupport(true);
    setError(false);
    try {
      await post({
        command: "redeemReward",
        rewardEntitlementId: reward.id,
        releaseId,
        units: units.toString(),
        scale: reward.scale,
        asset: reward.asset,
        redemptionId: intent.id,
      });
      await load();
      supportIntentRef.current = null;
      setJustSupported(intent.id);
      setAmount("");
    } catch {
      setError(true);
    } finally {
      pendingSupportRef.current = false;
      setPendingSupport(false);
    }
  }

  const power = desk?.purchasingPower[0] ?? null;
  const earned = desk?.assignments.find((assignment) => assignment.reward && assignment.reward.remaining.units !== "0");
  const supportGroups = groupSupportHistory(desk?.redemptions ?? []);
  const supportLabel = pendingSupport
    ? t.registeringSupport
    : earned
      ? `${t.supportWith} ${amount.trim() ? `$${amount.trim()}` : dollars(earned.reward!.remaining.units, earned.reward!.scale)}`
      : t.redeem;
  const supportAmountUnits = (() => {
    if (!earned?.reward) return null;
    if (!amount.trim()) return BigInt(earned.reward.remaining.units);
    try {
      return decimalToUnits(amount, earned.reward.scale);
    } catch {
      return null;
    }
  })();
  const supportAllowed =
    earned?.reward && supportAmountUnits !== null
      ? supportSubmitAllowed({
          pending: pendingSupport,
          releaseId,
          remainingUnits: BigInt(earned.reward.remaining.units),
          amountUnits: supportAmountUnits,
        })
      : false;
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
            <form
              onSubmit={(event) => onRedeem(event, earned.reward!)}
              aria-busy={pendingSupport}
              className="grid gap-3 md:grid-cols-2"
            >
              {desk.targets.map((target) => (
                <label
                  key={target.id}
                  className={`rounded-2xl border p-4 ${pendingSupport ? "" : "cursor-pointer"} ${target.id === releaseId ? "border-accent" : "border-border"}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="release"
                    checked={target.id === releaseId}
                    disabled={pendingSupport}
                    onChange={() => {
                      if (pendingSupportRef.current) return;
                      setReleaseId(target.id);
                    }}
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
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-40 disabled:opacity-60"
                  aria-label={t.amount}
                  placeholder={t.amount}
                  value={amount}
                  disabled={pendingSupport}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <button
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
                  type="submit"
                  disabled={!supportAllowed}
                >
                  {supportLabel}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      {supportGroups.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-foreground/55">{t.yourSupports}</h2>
          <div className="mt-4 space-y-4">
            {supportGroups.map((group) => (
              <article key={group.releaseId} className="rounded-2xl border border-border bg-background/80 p-5">
                <h3 className="text-lg font-semibold">{group.releaseTitle}</h3>
                {group.total ? (
                  <p className="mt-1 text-sm font-medium">
                    {t.totalSupported}: {supportMoney(group.total)}
                  </p>
                ) : null}
                <ul className="mt-4 space-y-3">
                  {group.rows.map((row) => (
                    <li
                      key={row.redemptionId}
                      className={`rounded-xl px-4 py-3 ${row.redemptionId === justSupported ? "bg-accent/10" : "bg-border/20"}`}
                    >
                      <p className="text-sm">{t.supportAmount}</p>
                      <p className="mt-1 text-lg font-semibold">{supportMoney(row.amount)}</p>
                      <ul className="mt-2 space-y-1 text-sm text-foreground/70">
                        {row.participants.map((participant, index) => (
                          <li key={`${row.redemptionId}-${participant.name ?? "participant"}-${index}`}>
                            {participant.name ?? t.artist}
                            {typeof participant.shareBps === "number" ? ` · ${participant.shareBps / 100}%` : ""}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-foreground/45">{t.economicSection}</p>
                      <p className="text-sm font-medium">{t.supportRegistered}</p>
                      <p className="text-sm text-foreground/80">{t.economicCreated}</p>
                      <StellarEvidence redemptionId={row.redemptionId} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
