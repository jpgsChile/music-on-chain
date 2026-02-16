"use client";

import { useState, useCallback, useMemo } from "react";
import type { SongUploadState, WizardStep, UploadValidationErrors } from "@/types/upload";
import { INITIAL_UPLOAD_STATE } from "@/types/upload";
import type { RoyaltySplit } from "@/lib/artist-profile/types";
import { getStepErrors } from "./validation";
import { mintSongNFT } from "@/lib/contracts/songNft";

export interface UseSongUploadWizardOptions {
  artistWallet: string;
  defaultRoyaltySplits: RoyaltySplit[];
  onComplete?: () => void;
}

export function useSongUploadWizard({
  artistWallet,
  defaultRoyaltySplits,
  onComplete,
}: UseSongUploadWizardOptions) {
  const [state, setState] = useState<SongUploadState>(INITIAL_UPLOAD_STATE);
  const [errors, setErrors] = useState<UploadValidationErrors>({});

  const setStep = useCallback((step: WizardStep) => {
    setState((s) => ({ ...s, step }));
    setErrors({});
  }, []);

  const update = useCallback(<K extends keyof SongUploadState>(key: K, value: SongUploadState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key as keyof UploadValidationErrors];
      return next;
    });
  }, []);

  const currentErrors = useMemo(
    () => getStepErrors(state.step, state, defaultRoyaltySplits),
    [state.step, state, defaultRoyaltySplits]
  );

  const canProceed = useMemo(() => {
    const stepErrors = getStepErrors(state.step, state, defaultRoyaltySplits);
    return Object.keys(stepErrors).length === 0;
  }, [state, defaultRoyaltySplits]);

  const effectiveSplits = state.useDefaultRights ? defaultRoyaltySplits : state.royaltySplits;

  const goNext = useCallback(() => {
    const stepErrors = getStepErrors(state.step, state, defaultRoyaltySplits);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    if (state.step < 5) setStep((state.step + 1) as WizardStep);
  }, [state, defaultRoyaltySplits]);

  const goBack = useCallback(() => {
    if (state.step > 1) setStep((state.step - 1) as WizardStep);
  }, [state.step, setStep]);

  const runMint = useCallback(async () => {
    const stepErrors = getStepErrors(5, state, defaultRoyaltySplits);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    update("isMinting", true);
    update("mintError", null);
    try {
      const metadata = {
        name: state.title,
        genre: state.genre,
        language: state.language,
        aiUsage: state.aiUsage,
        aiUsageDescription: state.aiUsageDescription || undefined,
        royaltySplits: effectiveSplits,
      };
      const tokenURI = "data:application/json," + encodeURIComponent(JSON.stringify(metadata));
      const result = await mintSongNFT({
        artistAddress: artistWallet,
        tokenURI,
      });
      if (result.success) {
        update("mintTxHash", result.txHash ?? null);
        update("mintTokenId", result.tokenId ?? null);
        onComplete?.();
      } else {
        update("mintError", result.error ?? "Mint failed.");
      }
    } catch (e) {
      update("mintError", e instanceof Error ? e.message : "Mint failed.");
    } finally {
      update("isMinting", false);
    }
  }, [state, defaultRoyaltySplits, effectiveSplits, artistWallet, update, onComplete]);

  const reset = useCallback(() => {
    setState(INITIAL_UPLOAD_STATE);
    setErrors({});
  }, []);

  return {
    state,
    update,
    errors: { ...currentErrors, ...errors },
    setErrors,
    canProceed,
    effectiveSplits,
    setStep,
    goNext,
    goBack,
    runMint,
    reset,
  };
}
