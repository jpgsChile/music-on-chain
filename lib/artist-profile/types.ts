/**
 * Artist Profile – public channel of an Actor.
 * Actor owns the profile. Wallet is an optional capability / public lookup, not identity.
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

export const CHANNEL_SOCIAL_KEYS = [
  "spotify",
  "appleMusic",
  "youtube",
  "tiktok",
  "instagram",
  "x",
  "facebook",
  "website",
] as const;

export type ChannelSocialKey = (typeof CHANNEL_SOCIAL_KEYS)[number];

export type ArtistChannelSocials = Partial<Record<ChannelSocialKey, string>>;

export interface ArtistProfilePayload {
  artisticName?: string | null;
  country?: string | null;
  username?: string | null;
  biography?: string | null;
  bannerUrl?: string | null;
  avatarUrl?: string | null;
  socials?: ArtistChannelSocials | null;
  creativeRoles?: CreativeRole[];
  defaultRoyaltySplits?: RoyaltySplit[];
}

export interface ArtistProfileRecord {
  id: string;
  actorRef: string | null;
  wallet: string | null;
  artisticName: string | null;
  country: string | null;
  username: string | null;
  biography: string | null;
  bannerUrl: string | null;
  avatarUrl: string | null;
  socials: ArtistChannelSocials;
  /** Future: official verification. Not editable by artists yet. */
  verified: boolean;
  creativeRoles: CreativeRole[];
  defaultRoyaltySplits: RoyaltySplit[];
  attestationHash: string | null;
  attestationChainId: number | null;
  createdAt: string;
  updatedAt: string;
}
