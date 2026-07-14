/**
 * Investor presentation timing — total ~7 minutes (420s).
 * Durations are weighted for narrative emphasis.
 */

export const PRESENTATION_TOTAL_MS = 7 * 60 * 1000;

export const PRESENTATION_SLIDE_IDS = [
  "problem",
  "todayApps",
  "protocol",
  "architecture",
  "sdk",
  "settlement",
  "multichain",
  "marketplace",
  "revenue",
  "wins",
] as const;

export type PresentationSlideId = (typeof PRESENTATION_SLIDE_IDS)[number];

/** Per-slide dwell time while autoplaying. Sum = 420_000 ms. */
export const PRESENTATION_DURATIONS_MS: Record<PresentationSlideId, number> = {
  problem: 40_000,
  todayApps: 35_000,
  protocol: 45_000,
  architecture: 50_000,
  sdk: 45_000,
  settlement: 45_000,
  multichain: 40_000,
  marketplace: 40_000,
  revenue: 40_000,
  wins: 40_000,
};

/** Page section anchors to scroll/highlight behind the Keynote stage when exiting or as cues. */
export const PRESENTATION_PAGE_ANCHORS: Partial<
  Record<PresentationSlideId, string>
> = {
  architecture: "#architecture",
  sdk: "#console",
  settlement: "#architecture",
  multichain: "#chains",
};
