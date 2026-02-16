/**
 * Song Upload Wizard – state and step payloads.
 * Progressive disclosure: one step at a time; state accumulated for final mint.
 */

import type { RoyaltySplit } from "@/lib/artist-profile/types";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface SongUploadState {
  step: WizardStep;
  // Step 1
  audioFile: File | null;
  audioPreviewUrl: string | null;
  // Step 2
  title: string;
  genre: string;
  language: string;
  // Step 3
  aiUsage: boolean;
  aiUsageDescription: string;
  // Step 4: default from profile or override per song
  useDefaultRights: boolean;
  royaltySplits: RoyaltySplit[];
  // Step 5
  isMinting: boolean;
  mintTxHash: string | null;
  mintTokenId: string | null;
  mintError: string | null;
}

/** Validation errors: field key -> human-readable message */
export type UploadValidationErrors = Partial<{
  audioFile: string;
  title: string;
  genre: string;
  language: string;
  royaltySplits: string;
}>;

export const INITIAL_UPLOAD_STATE: SongUploadState = {
  step: 1,
  audioFile: null,
  audioPreviewUrl: null,
  title: "",
  genre: "",
  language: "",
  aiUsage: false,
  aiUsageDescription: "",
  useDefaultRights: true,
  royaltySplits: [],
  isMinting: false,
  mintTxHash: null,
  mintTokenId: null,
  mintError: null,
};
