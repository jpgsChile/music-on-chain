"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { decimalToUnits, formatMoney } from "@/lib/domain/fanEconomy/display";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { StudioEmptyState, StudioLoading, StudioPageHeader } from "@/components/studio/StudioStates";

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
        verification: string | null;
        evidenceId: string | null;
        reward: { id: string; remaining: Money } | null;
      }[];
    }[];
  }[];
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

export default function CampaignDesk() {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const [desk, setDesk] = useState<Desk | null>(null);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("10");
  const [missionTitle, setMissionTitle] = useState("");
  const [criterion, setCriterion] = useState("");
  const [missionAmount, setMissionAmount] = useState("5");

  const load = useCallback(async () => {
    const response = await fetch("/api/fan-economy?view=artist", { credentials: "include" });
    const json = await response.json();
    if (!json.ok) throw new Error("failed");
    setDesk(json);
  }, []);

  useEffect(() => {
    load().catch(() => setError(true));
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

  if (!desk) return <StudioLoading label={t.artistTitle} />;

  return (
    <div>
      <StudioPageHeader eyebrow={t.artistEyebrow} title={t.artistTitle} subtitle={t.artistSubtitle} />
      {error ? <p className="mb-4 text-sm text-red-400">{t.failed}</p> : null}
      <form onSubmit={onCampaign} className="mb-8 grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-3">
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
        <button className="rounded-lg bg-accent px-3 py-2 text-sm text-background" type="submit">
          {t.createCampaign}
        </button>
      </form>
      {desk.campaigns.length === 0 ? (
        <StudioEmptyState title={t.emptyCampaigns} description={t.artistSubtitle} />
      ) : (
        <div className="space-y-6">
          {desk.campaigns.map((campaign) => (
            <section key={campaign.id} className="rounded-2xl border border-border p-4">
              <h2 className="text-lg font-semibold">{campaign.title}</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-foreground/50">{t.committed}</dt>
                  <dd>{formatMoney(campaign.committed.units, campaign.committed.scale, campaign.committed.asset)}</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">{t.standing}</dt>
                  <dd>{formatMoney(campaign.standing.units, campaign.standing.scale, campaign.standing.asset)}</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">{t.availableToAuthorize}</dt>
                  <dd>
                    {formatMoney(
                      campaign.availableToAuthorize.units,
                      campaign.availableToAuthorize.scale,
                      campaign.availableToAuthorize.asset
                    )}
                  </dd>
                </div>
              </dl>
              <form onSubmit={(event) => onMission(event, campaign.id)} className="mt-4 grid gap-2 sm:grid-cols-4">
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
              <ul className="mt-4 space-y-3">
                {campaign.missions.map((mission) => (
                  <li key={mission.id} className="rounded-xl bg-border/20 p-3 text-sm">
                    <p className="font-medium">{mission.title}</p>
                    <p className="text-foreground/60">{mission.criterion}</p>
                    {mission.assignments.map((assignment) => (
                      <div key={assignment.id} className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-foreground/70">{assignment.state}</span>
                        {assignment.verification ? <span>{assignment.verification}</span> : null}
                        {assignment.reward ? (
                          <span>
                            {formatMoney(
                              assignment.reward.remaining.units,
                              assignment.reward.remaining.scale,
                              assignment.reward.remaining.asset
                            )}
                          </span>
                        ) : null}
                        {assignment.evidenceId && assignment.state === "evidence-submitted" ? (
                          <>
                            <button
                              type="button"
                              className="rounded-lg border border-border px-2 py-1"
                              onClick={() => verify(assignment.id, assignment.evidenceId!, "accepted")}
                            >
                              {t.verify}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-border px-2 py-1"
                              onClick={() => verify(assignment.id, assignment.evidenceId!, "rejected")}
                            >
                              {t.reject}
                            </button>
                          </>
                        ) : null}
                        {assignment.state === "verified" && !assignment.reward ? (
                          <button
                            type="button"
                            className="rounded-lg bg-accent px-2 py-1 text-background"
                            onClick={() => authorize(assignment.id, mission.maximumReward)}
                          >
                            {t.authorize}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
