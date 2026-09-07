"use client";

import { useMemo } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useArtistProfile } from "@/lib/artist-profile/useArtistProfile";
import { getArtistByWallet } from "@/data/artists";
import { useReleaseWizard } from "@/lib/upload/useSongUploadWizard";
import ReleaseProgress from "./ReleaseProgress";
import StepGeneral from "./StepGeneral";
import StepTracks from "./StepTracks";
import StepCollaborators from "./StepCollaborators";
import StepPricing from "./StepPricing";
import StepReview, { ReleaseFanPreview } from "./StepReview";
import Link from "next/link";

interface ReleaseWizardProps {
  actorRef: string;
  artistWallet: string;
  onComplete?: (releaseId: string) => void;
}

export default function ReleaseWizard({ actorRef, artistWallet, onComplete }: ReleaseWizardProps) {
  const locale = useLocale();
  const t = getTranslations(locale).uploadWizard as Record<string, string>;
  const { profile } = useArtistProfile(artistWallet, actorRef);
  const catalog = useMemo(() => getArtistByWallet(artistWallet), [artistWallet]);
  const artistName =
    profile?.artisticName?.trim() || catalog?.name || t.defaultArtist;

  const wizard = useReleaseWizard({
    actorRef,
    artistWallet,
    artistName,
    onComplete,
  });

  const {
    state,
    patch,
    update,
    errors,
    royaltyTotal,
    goNext,
    goBack,
    addTrack,
    updateTrack,
    removeTrack,
    addCollaborator,
    updateCollaborator,
    removeCollaborator,
    togglePricingModel,
    publish,
  } = wizard;

  const stepLabels = [
    t.step1Title,
    t.step2Title,
    t.step3Title,
    t.step4Title,
    t.step5Title,
  ];

  if (state.publishedId) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-8 text-center">
          <p className="text-lg font-semibold text-emerald-400">{t.publishSuccess}</p>
          <p className="mt-2 text-sm text-foreground/60">{t.publishSuccessDesc}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/music"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-hover"
            >
              {t.goWorks}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-border px-5 py-2.5 text-sm text-foreground/70 hover:text-foreground"
            >
              {t.goDashboard}
            </Link>
          </div>
        </div>
        <ReleaseFanPreview state={state} artistName={artistName} t={t} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <ReleaseProgress step={state.step} labels={stepLabels} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="rounded-2xl border border-border bg-background/80 p-5 sm:p-7">
          {state.step === 1 && (
            <StepGeneral
              title={state.title}
              releaseType={state.releaseType}
              language={state.language}
              primaryGenre={state.primaryGenre}
              secondaryGenre={state.secondaryGenre}
              description={state.description}
              coverUrl={state.coverUrl}
              errors={errors}
              t={t}
              onChange={(partial) => patch(partial)}
            />
          )}
          {state.step === 2 && (
            <StepTracks
              tracks={state.tracks}
              errors={errors}
              t={t}
              onAdd={addTrack}
              onRemove={removeTrack}
              onUpdate={updateTrack}
            />
          )}
          {state.step === 3 && (
            <StepCollaborators
              soloCreator={state.soloCreator}
              collaborators={state.collaborators}
              royaltyTotal={royaltyTotal}
              errors={errors}
              t={t}
              onSolo={(solo) => {
                update("soloCreator", solo);
                if (solo) update("collaborators", []);
              }}
              onAdd={addCollaborator}
              onRemove={removeCollaborator}
              onUpdate={updateCollaborator}
            />
          )}
          {state.step === 4 && (
            <StepPricing
              pricingModels={state.pricingModels}
              priceUsdc={state.priceUsdc}
              errors={errors}
              t={t}
              onToggleModel={togglePricingModel}
              onPrice={(price) => update("priceUsdc", price)}
            />
          )}
          {state.step === 5 && (
            <StepReview
              state={state}
              artistName={artistName}
              t={t}
              isPublishing={state.isPublishing}
              publishError={state.publishError}
              publishedId={state.publishedId}
              onPublish={() => void publish()}
            />
          )}

          {state.step < 5 ? (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
              {state.step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="text-sm text-foreground/60 hover:text-foreground"
                >
                  {t.back}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
              >
                {t.next}
              </button>
            </div>
          ) : state.step === 5 && !state.publishedId ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={goBack}
                className="text-sm text-foreground/60 hover:text-foreground"
              >
                {t.back}
              </button>
            </div>
          ) : null}
        </div>

        {state.step < 5 ? (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ReleaseFanPreview state={state} artistName={artistName} t={t} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** Alias for existing imports */
export { ReleaseWizard as SongUploadWizard };
