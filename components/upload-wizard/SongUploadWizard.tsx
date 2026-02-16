"use client";

import { useMemo } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useArtistProfile } from "@/lib/artist-profile/useArtistProfile";
import { useSongUploadWizard } from "@/lib/upload/useSongUploadWizard";
import Step1Upload from "./Step1Upload";
import Step2Metadata from "./Step2Metadata";
import Step3AIUsage from "./Step3AIUsage";
import Step4Rights from "./Step4Rights";
import Step5Mint from "./Step5Mint";

interface SongUploadWizardProps {
  artistWallet: string;
  onComplete?: () => void;
}

export default function SongUploadWizard({ artistWallet, onComplete }: SongUploadWizardProps) {
  const locale = useLocale();
  const t = (getTranslations(locale).uploadWizard ?? {}) as Record<string, string>;
  const { profile } = useArtistProfile(artistWallet);
  const defaultSplits = useMemo(() => profile?.defaultRoyaltySplits ?? [], [profile]);
  const wizard = useSongUploadWizard({
    artistWallet,
    defaultRoyaltySplits: defaultSplits,
    onComplete,
  });

  const { state, update, errors, goNext, goBack, runMint } = wizard;
  const stepTitles = [t.step1Title, t.step2Title, t.step3Title, t.step4Title, t.step5Title];

  const handleUseDefaultRights = (v: boolean) => {
    update("useDefaultRights", v);
    if (!v && state.royaltySplits.length === 0 && defaultSplits.length > 0) {
      update("royaltySplits", defaultSplits.map((s) => ({ ...s })));
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-2">{t.title}</h1>
      <div className="flex gap-2 mb-6">
        {stepTitles.map((label, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-1 rounded ${
              state.step === i + 1 ? "bg-accent text-background" : "bg-border/30 text-foreground/70"
            }`}
          >
            {t.step} {i + 1}
          </span>
        ))}
      </div>

      <div className="border border-border rounded-xl p-6 bg-background">
        {state.step === 1 && (
          <Step1Upload
            audioFile={state.audioFile}
            onFileChange={(file, url) => {
              update("audioFile", file);
              update("audioPreviewUrl", url);
            }}
            error={errors.audioFile}
            t={t}
          />
        )}
        {state.step === 2 && (
          <Step2Metadata
            title={state.title}
            genre={state.genre}
            language={state.language}
            onTitleChange={(v) => update("title", v)}
            onGenreChange={(v) => update("genre", v)}
            onLanguageChange={(v) => update("language", v)}
            errors={errors}
            t={t}
          />
        )}
        {state.step === 3 && (
          <Step3AIUsage
            aiUsage={state.aiUsage}
            aiUsageDescription={state.aiUsageDescription}
            onAiUsageChange={(v) => update("aiUsage", v)}
            onDescriptionChange={(v) => update("aiUsageDescription", v)}
            t={t}
          />
        )}
        {state.step === 4 && (
          <Step4Rights
            useDefaultRights={state.useDefaultRights}
            royaltySplits={state.royaltySplits}
            defaultSplits={defaultSplits}
            onUseDefaultChange={handleUseDefaultRights}
            onSplitsChange={(s) => update("royaltySplits", s)}
            error={errors.royaltySplits}
            t={t}
          />
        )}
        {state.step === 5 && (
          <Step5Mint
            title={state.title}
            isMinting={state.isMinting}
            mintTxHash={state.mintTxHash}
            mintTokenId={state.mintTokenId}
            mintError={state.mintError}
            onMint={runMint}
            t={t}
          />
        )}

        <div className="mt-8 flex justify-between">
          {state.step > 1 ? (
            <button type="button" onClick={goBack} className="px-4 py-2 text-foreground/80 hover:underline">
              {t.back}
            </button>
          ) : (
            <span />
          )}
          {state.step < 5 && (
            <button
              type="button"
              onClick={goNext}
              className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover"
            >
              {t.next}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
