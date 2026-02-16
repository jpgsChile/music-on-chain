/**
 * Song Upload Wizard – validation with human-readable error messages.
 */

import type { SongUploadState, UploadValidationErrors } from "@/types/upload";
import { validateRoyaltySplits } from "@/lib/artist-profile/types";

const ACCEPTED_AUDIO = "audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/x-m4a,audio/mp4";
const MAX_FILE_MB = 50;

export function getAcceptedAudioTypes(): string {
  return ACCEPTED_AUDIO;
}

export function validateStep1(state: Pick<SongUploadState, "audioFile">): UploadValidationErrors {
  const err: UploadValidationErrors = {};
  if (!state.audioFile) {
    err.audioFile = "Selecciona un archivo de audio.";
    return err;
  }
  const allowed = ACCEPTED_AUDIO.split(",").map((t) => t.trim());
  const type = state.audioFile.type?.toLowerCase();
  if (type && !allowed.some((a) => type === a || type.startsWith(a.split("/")[0] + "/"))) {
    err.audioFile = "Formato no válido. Usa MP3, WAV, OGG, WebM o M4A.";
    return err;
  }
  const sizeMB = state.audioFile.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_MB) {
    err.audioFile = `El archivo no puede superar ${MAX_FILE_MB} MB.`;
    return err;
  }
  return err;
}

export function validateStep2(state: Pick<SongUploadState, "title" | "genre" | "language">): UploadValidationErrors {
  const err: UploadValidationErrors = {};
  const t = state.title?.trim();
  if (!t) {
    err.title = "El título es obligatorio.";
  } else if (t.length > 200) {
    err.title = "El título no puede tener más de 200 caracteres.";
  }
  return err;
}

export function validateStep4(
  state: Pick<SongUploadState, "useDefaultRights" | "royaltySplits">,
  defaultSplits: { role: string; percentage: number }[]
): UploadValidationErrors {
  const err: UploadValidationErrors = {};
  const splits = state.useDefaultRights ? defaultSplits : state.royaltySplits;
  if (!splits?.length) {
    err.royaltySplits = "Añade al menos un rol con su porcentaje.";
    return err;
  }
  const result = validateRoyaltySplits(splits);
  if (!result.valid) {
    err.royaltySplits = result.error ?? "El reparto debe sumar 100%.";
  }
  return err;
}

export function getStepErrors(
  step: 1 | 2 | 3 | 4 | 5,
  state: SongUploadState,
  defaultRoyaltySplits: { role: string; percentage: number }[]
): UploadValidationErrors {
  switch (step) {
    case 1:
      return validateStep1(state);
    case 2:
      return validateStep2(state);
    case 4:
      return validateStep4(state, defaultRoyaltySplits);
    case 3:
    case 5:
    default:
      return {};
  }
}
