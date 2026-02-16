/**
 * Artist Profile – shared types for API and UI.
 * Profile is keyed by wallet; reusable across all songs (default royalty splits, roles).
 */

export const CREATIVE_ROLES = [
  "composer",
  "author",
  "composer-author",
  "producer",
  "arranger",
  "adapter",
  "translator",
] as const;

export type CreativeRole = (typeof CREATIVE_ROLES)[number];

export interface RoyaltySplit {
  role: string;
  percentage: number;
}

export interface ArtistProfilePayload {
  artisticName?: string | null;
  country?: string | null;
  creativeRoles?: CreativeRole[];
  defaultRoyaltySplits?: RoyaltySplit[];
}

export interface ArtistProfileRecord {
  id: string;
  wallet: string;
  artisticName: string | null;
  country: string | null;
  creativeRoles: CreativeRole[];
  defaultRoyaltySplits: RoyaltySplit[];
  attestationHash: string | null;
  attestationChainId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Validate that royalty splits sum to 100 and have valid roles. */
export function validateRoyaltySplits(splits: RoyaltySplit[]): { valid: boolean; error?: string } {
  const sum = splits.reduce((a, s) => a + s.percentage, 0);
  if (Math.abs(sum - 100) > 0.01) {
    return { valid: false, error: "Royalty splits must sum to 100%" };
  }
  if (splits.some((s) => s.percentage < 0 || s.percentage > 100)) {
    return { valid: false, error: "Each percentage must be between 0 and 100" };
  }
  return { valid: true };
}
