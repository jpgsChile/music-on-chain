/**
 * Artist Profile – shared types for API and UI.
 * Profile is keyed by wallet; reusable across all songs (default royalty splits, roles).
 *
 * Royalty validation lives in @moc/domain (Core Protocol) and is re-exported here
 * so existing imports keep working without behavior change.
 */

import type { RoyaltySplit } from "@moc/domain";

export type { RoyaltySplit } from "@moc/domain";
export {
  validateRoyaltySplits,
  type ValidateRoyaltySplitsResult,
} from "@moc/domain";

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
