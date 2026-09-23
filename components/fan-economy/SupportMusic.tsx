"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { decimalToUnits, formatMoney } from "@/lib/domain/fanEconomy/display";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { StudioEmptyState, StudioLoading, StudioPageHeader } from "@/components/studio/StudioStates";

type Money = { units: string; scale: number; asset: string };

type FanView = {
  purchasingPower: Money[];
  missions: { id: string; title: string; criterion: string; campaignTitle: string; maximumReward: Money }[];
  assignments: {
    id: string;
    state: string;
    missionTitle: string;
    evidenceIds: string[];
    reward: { id: string; remaining: Money; asset: string; scale: number } | null;
  }[];
  redemptions: {
    redemptionId: string;
    releaseTitle: string | null;
    amount: Money;
    state: string;
  }[];
  targets: { id: string; title: string }[];
};

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
  const [error, setError] = useState(false);
  const [statement, setStatement] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/fan-economy", { credentials: "include" });
    const json = await response.json();
    if (!json.ok) throw new Error("failed");
    setDesk(json);
    setReleaseId((current) => current || json.targets?.[0]?.id || "");
  }, []);

  useEffect(() => {
    load().catch(() => setError(true));
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
    const units = amount.trim()
      ? decimalToUnits(amount, reward.scale)
      : BigInt(reward.remaining.units);
    await run({
      command: "redeemReward",
      rewardEntitlementId: reward.id,
      releaseId,
      units: units.toString(),
      scale: reward.scale,
      asset: reward.asset,
      redemptionId: `redeem-${crypto.randomUUID().slice(0, 12)}`,
    });
    setAmount("");
  }

  if (!desk) return <StudioLoading label={t.fanTitle} />;

  return (
    <div>
      <StudioPageHeader eyebrow={t.fanEyebrow} title={t.fanTitle} subtitle={t.fanSubtitle} />
      {error ? <p className="mb-4 text-sm text-red-400">{t.failed}</p> : null}
      <section className="mb-8 rounded-2xl border border-border p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-foreground/45">{t.available}</p>
        {desk.purchasingPower.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">{t.emptyPower}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {desk.purchasingPower.map((row) => (
              <li key={`${row.asset}-${row.scale}`} className="text-2xl font-semibold">
                {formatMoney(row.units, row.scale, row.asset)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">{t.accept}</h2>
        {desk.missions.length === 0 ? (
          <StudioEmptyState title={t.emptyMissions} description={t.fanSubtitle} />
        ) : (
          <ul className="space-y-3">
            {desk.missions.map((mission) => (
              <li key={mission.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div>
                  <p className="font-medium">{mission.title}</p>
                  <p className="text-sm text-foreground/60">
                    {mission.campaignTitle} · {mission.criterion}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-accent px-3 py-2 text-sm text-background"
                  onClick={() => run({ command: "acceptMission", missionId: mission.id })}
                >
                  {t.accept}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-4">
        {desk.assignments.map((assignment) => (
          <article key={assignment.id} className="rounded-2xl border border-border p-4">
            <p className="font-medium">{assignment.missionTitle}</p>
            <p className="text-sm text-foreground/55">{assignment.state}</p>
            {assignment.state === "active" ? (
              <form onSubmit={(event) => onEvidence(event, assignment.id)} className="mt-3 flex gap-2">
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
            ) : null}
            {assignment.reward && assignment.reward.remaining.units !== "0" ? (
              <form onSubmit={(event) => onRedeem(event, assignment.reward!)} className="mt-3 grid gap-2 sm:grid-cols-3">
                <p className="sm:col-span-3 text-sm">
                  {t.available}:{" "}
                  {formatMoney(assignment.reward.remaining.units, assignment.reward.remaining.scale, assignment.reward.remaining.asset)}
                </p>
                {desk.targets.length === 0 ? (
                  <p className="sm:col-span-3 text-sm text-foreground/60">{t.noReleases}</p>
                ) : (
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    aria-label={t.chooseRelease}
                    value={releaseId}
                    onChange={(event) => setReleaseId(event.target.value)}
                  >
                    {desk.targets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.title}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  aria-label={t.amount}
                  placeholder={t.amount}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <button className="rounded-lg bg-accent px-3 py-2 text-sm text-background" type="submit" disabled={!releaseId}>
                  {t.redeem}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                  onClick={() =>
                    run({
                      command: "releaseReward",
                      rewardEntitlementId: assignment.reward!.id,
                      units: assignment.reward!.remaining.units,
                      scale: assignment.reward!.scale,
                      asset: assignment.reward!.asset,
                      commandId: `release-${crypto.randomUUID().slice(0, 12)}`,
                    })
                  }
                >
                  {t.release}
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
      <ul className="mt-6 space-y-2">
        {desk.redemptions.map((redemption) => (
          <li key={redemption.redemptionId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
            <span>
              {redemption.releaseTitle} · {formatMoney(redemption.amount.units, redemption.amount.scale, redemption.amount.asset)} ·{" "}
              {redemption.state === "reversed" ? t.redemptionReversed : t.redemptionRecorded}
            </span>
            {redemption.state === "recorded" ? (
              <button
                type="button"
                className="rounded-lg border border-border px-2 py-1"
                onClick={() => run({ command: "reverseRedemption", redemptionId: redemption.redemptionId })}
              >
                {t.reverse}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
