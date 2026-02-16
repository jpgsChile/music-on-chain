import type { Track } from "@/data/artists";

const STORAGE_KEY = "moc-artist-extra-tracks";

export interface StoredArtistTracks {
  [artistSlug: string]: Track[];
}

function loadAll(): StoredArtistTracks {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredArtistTracks;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(data: StoredArtistTracks): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** Get extra tracks added by the artist (client-side only). */
export function getExtraTracks(artistSlug: string): Track[] {
  const all = loadAll();
  const list = all[artistSlug];
  return Array.isArray(list) ? list : [];
}

/** Append a new track for an artist (client-side). Generates a simple id. */
export function addExtraTrack(artistSlug: string, track: Omit<Track, "id" | "currency">): Track {
  const all = loadAll();
  const list = all[artistSlug] ?? [];
  const id = `${artistSlug}-extra-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const newTrack: Track = {
    ...track,
    id,
    currency: "USDC",
  };
  all[artistSlug] = [...list, newTrack];
  saveAll(all);
  return newTrack;
}

/** Remove an extra track by id. */
export function removeExtraTrack(artistSlug: string, trackId: string): void {
  const all = loadAll();
  const list = all[artistSlug] ?? [];
  const filtered = list.filter((t) => t.id !== trackId);
  if (filtered.length === 0) {
    const next = { ...all };
    delete next[artistSlug];
    saveAll(next);
  } else {
    all[artistSlug] = filtered;
    saveAll(all);
  }
}
