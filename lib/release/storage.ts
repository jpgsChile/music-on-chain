import type {
  PricingModel,
  ReleaseCollaborator,
  ReleaseType,
} from "@/types/upload";

const STORAGE_KEY = "moc-published-releases";

export interface PublishedReleaseTrack {
  title: string;
  version: string;
  durationSec: number | null;
  explicit: boolean;
  lyrics: string;
  previewUrl: string | null;
}

export interface PublishedRelease {
  id: string;
  actorRef?: string;
  wallet: string;
  artistSlug: string;
  title: string;
  releaseType: ReleaseType;
  language: string;
  primaryGenre: string;
  secondaryGenre: string;
  description: string;
  coverUrl: string | null;
  trackIds: string[];
  tracks: PublishedReleaseTrack[];
  soloCreator: boolean;
  collaborators: ReleaseCollaborator[];
  pricingModels: PricingModel[];
  priceUsdc: number;
  network: "base";
  currency: "USDC";
  tokenId: string | null;
  publishedAt: string;
}

function loadAll(): PublishedRelease[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PublishedRelease[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(list: PublishedRelease[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota
  }
}

export function savePublishedRelease(
  release: PublishedRelease
): string {
  const all = loadAll();
  all.unshift(release);
  saveAll(all);
  return release.id;
}

export function getReleasesByWallet(wallet: string): PublishedRelease[] {
  const w = wallet.trim().toLowerCase();
  return loadAll().filter((r) => r.wallet === w);
}

export function getReleaseById(id: string): PublishedRelease | null {
  return loadAll().find((r) => r.id === id) ?? null;
}
