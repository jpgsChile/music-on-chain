/**
 * Provenance boundary: important domain changes should be reconstructable later.
 * This is not an on-chain evidence system. It prevents UI/session from being the only record.
 */

import type { DomainEvent } from "./types";

export function domainEvent(input: Omit<DomainEvent, "occurredAt"> & { occurredAt?: string }): DomainEvent {
  return {
    ...input,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}

/**
 * localStorage / session / Privy / wallet UI may cache UX.
 * They are not domain authority for Actor, Participation, or Rights.
 */
export const UX_CACHE_KEYS = {
  publishedReleases: "moc-published-releases",
  locale: "moc-locale",
} as const;

export const MOCK_ONLY_STORAGE_KEYS = {
  ownership: "music_on_chain_ownership",
  crowdfunding: "music_on_chain_crowdfunding",
} as const;
