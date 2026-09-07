"use client";

import type { ReleaseWizardState } from "@/types/upload";

type T = Record<string, string>;

interface Props {
  state: ReleaseWizardState;
  artistName: string;
  t: T;
}

function formatDuration(sec: number | null) {
  if (sec == null || Number.isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Fan-facing preview of the release */
export function ReleaseFanPreview({ state, artistName, t }: Props) {
  const typeLabel = t[`type_${state.releaseType}`] || state.releaseType;
  const models = state.pricingModels
    .map((m) => t[`pricing_${m}`] || m)
    .join(" · ");

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs uppercase tracking-[0.16em] text-foreground/40">
          {t.fanPreviewTitle}
        </p>
        <p className="text-xs text-foreground/50 mt-0.5">{t.fanPreviewHint}</p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-border/40">
            {state.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.coverUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground/25 text-xs">
                {t.cover}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-accent/80">
              {typeLabel}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground truncate">
              {state.title || t.untitled}
            </h3>
            <p className="mt-0.5 text-sm text-foreground/60">{artistName}</p>
            <p className="mt-2 text-xs text-foreground/45">
              {[state.primaryGenre, state.secondaryGenre, state.language]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-3 font-mono text-sm text-foreground">
              {state.priceUsdc} USDC
            </p>
            {models ? (
              <p className="mt-1 text-xs text-foreground/50">{models}</p>
            ) : null}
          </div>
        </div>

        {state.description ? (
          <p className="mt-4 text-sm leading-relaxed text-foreground/65 whitespace-pre-wrap line-clamp-4">
            {state.description}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          <p className="text-xs uppercase tracking-wider text-foreground/40">
            {t.tracklist}
          </p>
          {state.tracks.map((track, i) => (
            <div
              key={track.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <span className="font-mono text-xs text-foreground/35 w-5">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">
                  {track.title || t.untitledTrack}
                  {track.version ? (
                    <span className="text-foreground/40"> · {track.version}</span>
                  ) : null}
                  {track.explicit ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-foreground/40">
                      E
                    </span>
                  ) : null}
                </p>
              </div>
              <span className="font-mono text-xs text-foreground/45">
                {formatDuration(track.durationSec)}
              </span>
            </div>
          ))}
        </div>

        {state.tracks[0]?.previewUrl ? (
          <div className="mt-4">
            <audio controls src={state.tracks[0].previewUrl} className="w-full h-10" />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background">
            {t.buyCta} · {state.priceUsdc} USDC
          </span>
          <span className="rounded-full border border-border px-3 py-2 text-xs text-foreground/50">
            {t.networkBase}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ReviewProps extends Props {
  isPublishing: boolean;
  publishError: string | null;
  publishedId: string | null;
  onPublish: () => void;
}

export default function StepReview({
  state,
  artistName,
  t,
  isPublishing,
  publishError,
  publishedId,
  onPublish,
}: ReviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t.step5Title}</h2>
        <p className="mt-1 text-sm text-foreground/55">{t.step5Desc}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <SummaryRow label={t.fieldTitle} value={state.title} />
        <SummaryRow
          label={t.releaseType}
          value={t[`type_${state.releaseType}`] || state.releaseType}
        />
        <SummaryRow label={t.language} value={state.language} />
        <SummaryRow
          label={t.genre}
          value={[state.primaryGenre, state.secondaryGenre].filter(Boolean).join(" / ")}
        />
        <SummaryRow
          label={t.tracksCount}
          value={String(state.tracks.length)}
        />
        <SummaryRow
          label={t.collaboratorsSummary}
          value={
            state.soloCreator
              ? t.soloTitle
              : `${state.collaborators.length} · ${state.collaborators
                  .map((c) => `${c.name || "?"} ${c.percentage}%`)
                  .join(", ")}`
          }
        />
        <SummaryRow
          label={t.priceUsdc}
          value={`${state.priceUsdc} USDC`}
        />
        <SummaryRow label={t.network} value={t.networkBase} />
      </div>

      <ReleaseFanPreview state={state} artistName={artistName} t={t} />

      {publishError ? (
        <p className="text-sm text-red-400">{publishError}</p>
      ) : null}

      {publishedId ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
          {t.publishSuccess}
        </div>
      ) : (
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="w-full sm:w-auto rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {isPublishing ? t.publishing : t.publish}
        </button>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 px-3.5 py-2.5">
      <p className="text-[11px] uppercase tracking-wider text-foreground/40">{label}</p>
      <p className="mt-0.5 text-foreground truncate">{value || "—"}</p>
    </div>
  );
}
