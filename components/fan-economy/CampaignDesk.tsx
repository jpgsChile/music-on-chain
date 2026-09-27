"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { decimalToUnits, unitsToDecimal } from "@/lib/domain/fanEconomy/display";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { StudioEmptyState, StudioLoading, StudioPageHeader } from "@/components/studio/StudioStates";
import TestnetProof from "@/components/fan-economy/TestnetProof";
import { EvidenceBody } from "@/components/fan-economy/EvidenceBody";

type Money = { units: string; scale: number; asset: string };

type Desk = {
  campaigns: {
    id: string;
    title: string;
    committed: Money;
    standing: Money;
    availableToAuthorize: Money;
    missions: {
      id: string;
      title: string;
      criterion: string;
      maximumReward: Money;
      assignments: {
        id: string;
        state: string;
        fanActorRef: string;
        participantLabel: string;
        verification: string | null;
        evidenceId: string | null;
        evidenceText: string | null;
        reward: { id: string; remaining: Money } | null;
      }[];
    }[];
  }[];
};

function dollars(money: Money) {
  return `$${unitsToDecimal(money.units, money.scale)}`;
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

export default function CampaignDesk() {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const [desk, setDesk] = useState<Desk | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("10");
  const [missionTitle, setMissionTitle] = useState("");
  const [criterion, setCriterion] = useState("");
  const [missionAmount, setMissionAmount] = useState("5");

  const load = useCallback(async () => {
    const response = await fetch("/api/fan-economy?view=artist", {
      credentials: "include",
      signal: AbortSignal.timeout(8000),
    });
    const json = await response.json();
    if (!json.ok || !Array.isArray(json.campaigns)) throw new Error("failed");
    setDesk(json);
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

  async function onCampaign(event: FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      const units = decimalToUnits(amount, 6);
      await post({ command: "createCampaign", title, units: units.toString(), scale: 6, asset: "USDC" });
      setTitle("");
      await load();
    } catch {
      setError(true);
    }
  }

  async function onMission(event: FormEvent, campaignId: string) {
    event.preventDefault();
    setError(false);
    try {
      const units = decimalToUnits(missionAmount, 6);
      await post({
        command: "createMission",
        campaignId,
        title: missionTitle,
        criterion,
        units: units.toString(),
        scale: 6,
        asset: "USDC",
        assignmentMode: "fan-accept",
      });
      setMissionTitle("");
      setCriterion("");
      await load();
    } catch {
      setError(true);
    }
  }

  async function verify(assignmentId: string, evidenceId: string, outcome: "accepted" | "rejected") {
    setError(false);
    try {
      await post({ command: "recordVerification", assignmentId, evidenceId, outcome });
      await load();
    } catch {
      setError(true);
    }
  }

  async function authorize(assignmentId: string, money: Money) {
    setError(false);
    try {
      await post({
        command: "authorizeReward",
        assignmentId,
        units: money.units,
        scale: money.scale,
        asset: money.asset,
      });
      await load();
    } catch {
      setError(true);
    }
  }

  function assignmentStateLabel(assignment: Desk["campaigns"][number]["missions"][number]["assignments"][number]) {
    if (assignment.reward) return t.stateRewardAuthorized;
    if (assignment.state === "verified") return t.stateVerifiedWaiting;
    if (assignment.state === "evidence-submitted") return t.stateEvidencePending;
    if (assignment.state === "rejected") return t.stateRejected;
    if (assignment.state === "active") return t.stateAwaitingEvidence;
    return assignment.state;
  }

  return (
    <div>
      <StudioPageHeader eyebrow={t.artistEyebrow} title={t.artistTitle} subtitle={t.artistSubtitle} />
      <TestnetProof story="artist" />
      {phase === "loading" ? <StudioLoading label={t.artistTitle} /> : null}
      {phase === "error" || error ? <p className="mb-4 text-sm text-red-400">{t.failed}</p> : null}
      <form onSubmit={onCampaign} className="mb-8 grid gap-3 rounded-2xl border border-border bg-background/80 p-4 sm:grid-cols-3">
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          aria-label={t.campaignTitle}
          placeholder={t.campaignTitle}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          aria-label={t.amount}
          placeholder={t.amount}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <button className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background" type="submit">
          {t.createCampaign}
        </button>
      </form>
      {phase === "ready" && desk && desk.campaigns.length === 0 ? (
        <StudioEmptyState title={t.emptyCampaigns} description={t.artistSubtitle} />
      ) : phase === "ready" && desk ? (
        <div className="space-y-6">
          {desk.campaigns.map((campaign) => (
            <section key={campaign.id} className="rounded-2xl border border-border bg-background/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-semibold">{campaign.title}</h2>
                <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-foreground/70">
                  {t.statusActive}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label={t.committed} value={dollars(campaign.committed)} />
                <Stat label={t.standing} value={dollars(campaign.standing)} />
                <Stat label={t.availableToAuthorize} value={dollars(campaign.availableToAuthorize)} />
                <Stat label={t.missionCount} value={String(campaign.missions.length)} />
              </dl>
              <form onSubmit={(event) => onMission(event, campaign.id)} className="mt-5 grid gap-2 sm:grid-cols-4">
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  aria-label={t.missionTitle}
                  placeholder={t.missionTitle}
                  value={missionTitle}
                  onChange={(event) => setMissionTitle(event.target.value)}
                  required
                />
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  aria-label={t.criterion}
                  placeholder={t.criterion}
                  value={criterion}
                  onChange={(event) => setCriterion(event.target.value)}
                  required
                />
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  aria-label={t.amount}
                  placeholder={t.amount}
                  value={missionAmount}
                  onChange={(event) => setMissionAmount(event.target.value)}
                  required
                />
                <button className="rounded-lg border border-border px-3 py-2 text-sm" type="submit">
                  {t.createMission}
                </button>
              </form>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {campaign.missions.map((mission) => {
                  const pending = mission.assignments.filter(
                    (assignment) => assignment.evidenceId && assignment.state === "evidence-submitted"
                  ).length;
                  const authorized = mission.assignments.filter((assignment) => assignment.reward).length;
                  return (
                    <article key={mission.id} className="rounded-xl border border-border p-4">
                      <h3 className="font-medium">{mission.title}</h3>
                      <p className="mt-1 text-sm text-foreground/65">{mission.criterion}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <Stat label={t.maxReward} value={dollars(mission.maximumReward)} />
                        <Stat label={t.participants} value={String(mission.assignments.length)} />
                        <Stat label={t.pendingVerify} value={String(pending)} />
                        <Stat label={t.rewardsAuthorized} value={String(authorized)} />
                      </dl>
                      <div className="mt-3 space-y-3">
                        {mission.assignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-lg border border-border/80 bg-background/60 p-3 text-sm">
                            <p className="text-xs uppercase tracking-wide text-foreground/45">{t.participant}</p>
                            <p className="font-medium break-all">{assignment.participantLabel}</p>
                            <p className="mt-2 text-xs uppercase tracking-wide text-foreground/45">{t.status}</p>
                            <p className="text-foreground/80">{assignmentStateLabel(assignment)}</p>
                            {assignment.evidenceId ? (
                              <div className="mt-2">
                                <p className="text-xs uppercase tracking-wide text-foreground/45">{t.evidence}</p>
                                {assignment.evidenceText ? (
                                  <EvidenceBody text={assignment.evidenceText} openLabel={t.openEvidenceLink} />
                                ) : (
                                  <p className="mt-1 text-foreground/55">{t.evidenceUnavailable}</p>
                                )}
                              </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {assignment.evidenceId && assignment.state === "evidence-submitted" ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-lg bg-accent px-3 py-1.5 text-background"
                                    onClick={() => verify(assignment.id, assignment.evidenceId!, "accepted")}
                                  >
                                    {t.verifyEvidence}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-border px-3 py-1.5"
                                    onClick={() => verify(assignment.id, assignment.evidenceId!, "rejected")}
                                  >
                                    {t.reject}
                                  </button>
                                </>
                              ) : null}
                              {assignment.state === "verified" && !assignment.reward ? (
                                <button
                                  type="button"
                                  className="rounded-lg bg-accent px-3 py-1.5 text-background"
                                  onClick={() => authorize(assignment.id, mission.maximumReward)}
                                >
                                  {t.authorize}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-border/20 px-3 py-2">
      <dt className="text-xs text-foreground/50">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
