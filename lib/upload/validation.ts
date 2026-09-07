/**
 * Release Wizard validation – human-readable Spanish messages.
 */

import type { ReleaseWizardState, ReleaseValidationErrors } from "@/types/upload";
import { validateRoyaltySplits } from "@/lib/artist-profile/types";

const ACCEPTED_AUDIO =
  "audio/wav,audio/x-wav,audio/wave,audio/mpeg,audio/ogg,audio/webm,audio/x-m4a,audio/mp4";
const MAX_AUDIO_MB = 100;
const MAX_COVER_MB = 5;

export function getAcceptedAudioTypes(): string {
  return ACCEPTED_AUDIO;
}

export function getAcceptedCoverTypes(): string {
  return "image/jpeg,image/png,image/webp";
}

export function validateStep1(
  state: Pick<
    ReleaseWizardState,
    | "title"
    | "releaseType"
    | "language"
    | "primaryGenre"
    | "coverUrl"
    | "coverFile"
  >
): ReleaseValidationErrors {
  const err: ReleaseValidationErrors = {};
  const title = state.title?.trim();
  if (!title) err.title = "El título es obligatorio.";
  else if (title.length > 200) err.title = "Máximo 200 caracteres.";

  if (!state.releaseType) err.releaseType = "Elige un tipo de lanzamiento.";
  if (!state.language?.trim()) err.language = "Elige un idioma.";
  if (!state.primaryGenre?.trim()) err.primaryGenre = "Elige un género principal.";

  if (!state.coverUrl && !state.coverFile) {
    err.cover = "Sube la portada del lanzamiento.";
  } else if (state.coverFile) {
    const mb = state.coverFile.size / (1024 * 1024);
    if (mb > MAX_COVER_MB) err.cover = `La portada no puede superar ${MAX_COVER_MB} MB.`;
  }
  return err;
}

export function validateStep2(
  state: Pick<ReleaseWizardState, "tracks">
): ReleaseValidationErrors {
  const err: ReleaseValidationErrors = {};
  if (!state.tracks.length) {
    err.tracks = "Añade al menos una pista.";
    return err;
  }
  for (const track of state.tracks) {
    if (!track.file) {
      err.trackFile = "Cada pista necesita un archivo WAV (u audio).";
      return err;
    }
    const type = track.file.type?.toLowerCase() || "";
    const name = track.file.name.toLowerCase();
    const looksWav = name.endsWith(".wav") || type.includes("wav");
    const allowed = ACCEPTED_AUDIO.split(",").some(
      (a) => type === a.trim() || type.startsWith("audio/")
    );
    if (!allowed && !looksWav) {
      err.trackFile = "Formato no válido. Preferimos WAV (también MP3, OGG, M4A).";
      return err;
    }
    const mb = track.file.size / (1024 * 1024);
    if (mb > MAX_AUDIO_MB) {
      err.trackFile = `El audio no puede superar ${MAX_AUDIO_MB} MB.`;
      return err;
    }
    if (!track.title.trim()) {
      err.trackTitle = "Cada pista necesita un título.";
      return err;
    }
  }
  return err;
}

export function validateStep3(
  state: Pick<ReleaseWizardState, "soloCreator" | "collaborators">
): ReleaseValidationErrors {
  const err: ReleaseValidationErrors = {};
  if (state.soloCreator) return err;

  if (!state.collaborators.length) {
    err.collaborators = "Añade al menos un colaborador, o elige “Lo creé todo yo”.";
    return err;
  }

  for (const c of state.collaborators) {
    if (!c.name.trim()) {
      err.collaborators = "Cada colaborador necesita un nombre.";
      return err;
    }
    if (!c.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) {
      err.collaborators = "Cada colaborador necesita un email válido.";
      return err;
    }
  }

  const splits = state.collaborators.map((c) => ({
    role: c.role,
    percentage: c.percentage,
  }));
  const result = validateRoyaltySplits(splits);
  if (!result.valid) {
    err.collaborators = result.error ?? "Los porcentajes de regalías deben sumar 100%.";
  }
  return err;
}

export function validateStep4(
  state: Pick<ReleaseWizardState, "pricingModels" | "priceUsdc">
): ReleaseValidationErrors {
  const err: ReleaseValidationErrors = {};
  if (!state.pricingModels.length) {
    err.pricingModels = "Elige al menos una forma de venta.";
  }
  if (state.priceUsdc == null || Number.isNaN(state.priceUsdc) || state.priceUsdc < 0) {
    err.priceUsdc = "Indica un precio válido en USDC.";
  } else if (state.priceUsdc > 100_000) {
    err.priceUsdc = "El precio es demasiado alto.";
  }
  return err;
}

export function getStepErrors(
  step: 1 | 2 | 3 | 4 | 5,
  state: ReleaseWizardState
): ReleaseValidationErrors {
  switch (step) {
    case 1:
      return validateStep1(state);
    case 2:
      return validateStep2(state);
    case 3:
      return validateStep3(state);
    case 4:
      return validateStep4(state);
    case 5:
    default:
      return {};
  }
}

/** Legacy wrappers used by older imports */
export function validateStep1Legacy(state: ReleaseWizardState) {
  return validateStep1(state);
}
export function validateStep2Legacy(state: ReleaseWizardState) {
  return validateStep2(state);
}
export function validateStep4Legacy(state: ReleaseWizardState) {
  return validateStep3(state);
}
