import type { RoyaltySplit } from "./RoyaltySplit";

/** Legacy-compatible result shape (optional error). */
export type ValidateRoyaltySplitsResult = {
  valid: boolean;
  error?: string;
};

/**
 * Domain policy: royalty splits must sum to 100% and each share must be in [0, 100].
 * Migrated from lib/artist-profile/types.ts — behavior unchanged.
 */
export function validateRoyaltySplits(
  splits: RoyaltySplit[]
): ValidateRoyaltySplitsResult {
  const sum = splits.reduce((a, s) => a + s.percentage, 0);
  if (Math.abs(sum - 100) > 0.01) {
    return { valid: false, error: "Royalty splits must sum to 100%" };
  }
  if (splits.some((s) => s.percentage < 0 || s.percentage > 100)) {
    return { valid: false, error: "Each percentage must be between 0 and 100" };
  }
  return { valid: true };
}
