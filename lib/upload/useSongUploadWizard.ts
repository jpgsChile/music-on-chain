"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  ReleaseWizardState,
  WizardStep,
  ReleaseValidationErrors,
  ReleaseTrack,
  ReleaseCollaborator,
  PricingModel,
} from "@/types/upload";
import {
  INITIAL_RELEASE_STATE,
  createEmptyTrack,
  createEmptyCollaborator,
} from "@/types/upload";
import { getStepErrors } from "./validation";
import { mintSongNFT } from "@/lib/contracts/songNft";
import { addExtraTrack } from "@/lib/artistTracksStorage";
import { getArtistByWallet } from "@/data/artists";
import { savePublishedRelease } from "@/lib/release/storage";
import { resolveReleaseCoverUrl } from "@/lib/release/coverUrl";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("COVER_READ_FAILED"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("COVER_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export interface UseReleaseWizardOptions {
  actorRef: string;
  artistWallet: string;
  artistName?: string;
  onComplete?: (releaseId: string) => void;
}

export function useReleaseWizard({
  actorRef,
  artistWallet,
  artistName,
  onComplete,
}: UseReleaseWizardOptions) {
  const [state, setState] = useState<ReleaseWizardState>(INITIAL_RELEASE_STATE);
  const [errors, setErrors] = useState<ReleaseValidationErrors>({});

  const setStep = useCallback((step: WizardStep) => {
    setState((s) => ({ ...s, step }));
    setErrors({});
  }, []);

  const update = useCallback(
    <K extends keyof ReleaseWizardState>(key: K, value: ReleaseWizardState[K]) => {
      setState((s) => ({ ...s, [key]: value }));
      setErrors((e) => {
        const next = { ...e };
        delete next[key as keyof ReleaseValidationErrors];
        return next;
      });
    },
    []
  );

  const patch = useCallback((partial: Partial<ReleaseWizardState>) => {
    setState((s) => ({ ...s, ...partial }));
  }, []);

  const currentErrors = useMemo(() => getStepErrors(state.step, state), [state]);

  const canProceed = useMemo(
    () => Object.keys(getStepErrors(state.step, state)).length === 0,
    [state]
  );

  const royaltyTotal = useMemo(() => {
    if (state.soloCreator) return 100;
    return state.collaborators.reduce((a, c) => a + (Number(c.percentage) || 0), 0);
  }, [state.soloCreator, state.collaborators]);

  const goNext = useCallback(() => {
    const stepErrors = getStepErrors(state.step, state);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    if (state.step < 5) setStep((state.step + 1) as WizardStep);
  }, [state, setStep]);

  const goBack = useCallback(() => {
    if (state.step > 1) setStep((state.step - 1) as WizardStep);
  }, [state.step, setStep]);

  const addTrack = useCallback(() => {
    setState((s) => ({ ...s, tracks: [...s.tracks, createEmptyTrack()] }));
  }, []);

  const updateTrack = useCallback((id: string, partial: Partial<ReleaseTrack>) => {
    setState((s) => ({
      ...s,
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next.tracks;
      delete next.trackFile;
      delete next.trackTitle;
      return next;
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tracks: s.tracks.length <= 1 ? s.tracks : s.tracks.filter((t) => t.id !== id),
    }));
  }, []);

  const addCollaborator = useCallback(() => {
    setState((s) => ({
      ...s,
      soloCreator: false,
      collaborators:
        s.collaborators.length === 0
          ? [createEmptyCollaborator("composer", 100)]
          : [...s.collaborators, createEmptyCollaborator("author", 0)],
    }));
  }, []);

  const updateCollaborator = useCallback(
    (id: string, partial: Partial<ReleaseCollaborator>) => {
      setState((s) => ({
        ...s,
        collaborators: s.collaborators.map((c) =>
          c.id === id ? { ...c, ...partial } : c
        ),
      }));
      setErrors((e) => {
        const next = { ...e };
        delete next.collaborators;
        return next;
      });
    },
    []
  );

  const removeCollaborator = useCallback((id: string) => {
    setState((s) => {
      const next = s.collaborators.filter((c) => c.id !== id);
      return {
        ...s,
        collaborators: next,
        soloCreator: next.length === 0 ? true : s.soloCreator,
      };
    });
  }, []);

  const togglePricingModel = useCallback((model: PricingModel) => {
    setState((s) => {
      const has = s.pricingModels.includes(model);
      const next = has
        ? s.pricingModels.filter((m) => m !== model)
        : [...s.pricingModels, model];
      return { ...s, pricingModels: next };
    });
    setErrors((e) => {
      const next = { ...e };
      delete next.pricingModels;
      return next;
    });
  }, []);

  const publish = useCallback(async () => {
    const stepErrors = {
      ...getStepErrors(1, state),
      ...getStepErrors(2, state),
      ...getStepErrors(3, state),
      ...getStepErrors(4, state),
    };
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    update("isPublishing", true);
    update("publishError", null);

    try {
      const primary = state.tracks[0];
      const metadata = {
        name: state.title,
        releaseType: state.releaseType,
        language: state.language,
        primaryGenre: state.primaryGenre,
        secondaryGenre: state.secondaryGenre || undefined,
        description: state.description || undefined,
        tracks: state.tracks.map((t) => ({
          title: t.title,
          version: t.version || undefined,
          durationSec: t.durationSec,
          explicit: t.explicit,
        })),
        soloCreator: state.soloCreator,
        collaborators: state.soloCreator
          ? [{ name: artistName || "Artista", role: "composer", percentage: 100 }]
          : state.collaborators,
        pricingModels: state.pricingModels,
        priceUsdc: state.priceUsdc,
        network: "base",
        currency: "USDC",
      };

      const tokenURI =
        "data:application/json," + encodeURIComponent(JSON.stringify(metadata));
      let tokenId: string | null = null;
      if (artistWallet) {
        const result = await mintSongNFT({
          artistAddress: artistWallet,
          tokenURI,
        });
        if (!result.success) {
          update("publishError", result.error ?? "No se pudo publicar. Intenta de nuevo.");
          return;
        }
        tokenId = result.tokenId ?? null;
      }

      const artist = artistWallet ? getArtistByWallet(artistWallet) : undefined;
      const slug =
        artist?.slug ||
        (artistWallet
          ? `wallet-${artistWallet.replace(/^0x/i, "").slice(0, 8).toLowerCase()}`
          : `actor-${actorRef.slice(-8)}`);

      const audioUrl = primary?.previewUrl || "";
      const storedTrack = addExtraTrack(slug, {
        title: primary?.title || state.title,
        audioUrl,
        price: state.priceUsdc,
      });

      // Persist a durable cover (data URL). Never store ephemeral blob: previews.
      const durableCoverUrl = state.coverFile
        ? await readFileAsDataUrl(state.coverFile)
        : resolveReleaseCoverUrl(state.coverUrl);

      const persisted = await fetch("/api/releases", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: state.title,
          releaseType: state.releaseType,
          language: state.language,
          primaryGenre: state.primaryGenre,
          secondaryGenre: state.secondaryGenre,
          description: state.description,
          coverUrl: durableCoverUrl,
          soloCreator: state.soloCreator,
          primaryDisplayName: artistName,
          collaborators: state.soloCreator ? [] : state.collaborators,
          pricingModels: state.pricingModels,
          priceUsdc: state.priceUsdc,
          tokenId,
          tracks: state.tracks.map((t) => ({
            title: t.title,
            version: t.version,
            durationSec: t.durationSec,
            explicit: t.explicit,
            lyrics: t.lyrics,
            previewUrl: t.previewUrl,
          })),
        }),
      });
      const persistedJson = await persisted.json().catch(() => ({}));
      if (!persisted.ok || !persistedJson?.ok) {
        update("publishError", persistedJson.error ?? "No se pudo guardar el lanzamiento.");
        return;
      }

      const releaseId = savePublishedRelease({
        id: persistedJson.value.id,
        actorRef,
        wallet: artistWallet ? artistWallet.toLowerCase() : "",
        artistSlug: slug,
        title: state.title,
        releaseType: state.releaseType,
        language: state.language,
        primaryGenre: state.primaryGenre,
        secondaryGenre: state.secondaryGenre,
        description: state.description,
        coverUrl: durableCoverUrl,
        trackIds: [storedTrack.id],
        tracks: state.tracks.map((t) => ({
          title: t.title,
          version: t.version,
          durationSec: t.durationSec,
          explicit: t.explicit,
          lyrics: t.lyrics,
          previewUrl: t.previewUrl,
        })),
        soloCreator: state.soloCreator,
        collaborators: state.soloCreator ? [] : state.collaborators,
        pricingModels: state.pricingModels,
        priceUsdc: state.priceUsdc,
        network: "base",
        currency: "USDC",
        tokenId,
        publishedAt: new Date().toISOString(),
      });

      update("publishedId", releaseId);
      onComplete?.(releaseId);
    } catch (e) {
      update(
        "publishError",
        e instanceof Error ? e.message : "No se pudo publicar. Intenta de nuevo."
      );
    } finally {
      update("isPublishing", false);
    }
  }, [state, actorRef, artistWallet, artistName, update, onComplete]);

  const reset = useCallback(() => {
    setState(INITIAL_RELEASE_STATE);
    setErrors({});
  }, []);

  return {
    state,
    update,
    patch,
    errors: { ...currentErrors, ...errors },
    setErrors,
    canProceed,
    royaltyTotal,
    setStep,
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
    reset,
  };
}

/** @deprecated */
export const useSongUploadWizard = useReleaseWizard;
