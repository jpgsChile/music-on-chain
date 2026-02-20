"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrackOwnership } from "@/types/ownership";

const STORAGE_KEY = "music_on_chain_ownership";

function normalizeEntry(o: Record<string, unknown>): TrackOwnership | null {
  const buyer = (o.buyer ?? o.wallet) as string | undefined;
  const artist = (o.artist ?? "") as string;
  const trackId = (o.trackId ?? o.track) as string | undefined;
  const txHash = (o.txHash ?? "") as string;
  const purchasedAt = (o.purchasedAt ?? "") as string;
  if (!buyer || !artist || !trackId || !txHash || !purchasedAt) return null;
  return {
    buyer,
    artist,
    trackId,
    txHash,
    chain: "avalanche-fuji",
    purchasedAt,
  };
}

function loadOwnership(): TrackOwnership[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: TrackOwnership[] = [];
    for (const o of parsed) {
      const entry = normalizeEntry(typeof o === "object" && o ? (o as Record<string, unknown>) : {});
      if (entry) out.push(entry);
    }
    return out;
  } catch {
    return [];
  }
}

function saveOwnership(list: TrackOwnership[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useTrackOwnership() {
  const [ownership, setOwnership] = useState<TrackOwnership[]>([]);

  useEffect(() => {
    setOwnership(loadOwnership());
  }, []);

  const addOwnership = useCallback((record: TrackOwnership) => {
    setOwnership((prev) => {
      const next = [...prev, record];
      saveOwnership(next);
      return next;
    });
  }, []);

  const ownsTrack = useCallback(
    (wallet: string, artist: string, trackId: string) =>
      ownership.some(
        (o) =>
          o.buyer.toLowerCase() === wallet.toLowerCase() &&
          o.artist.toLowerCase() === artist.toLowerCase() &&
          o.trackId === trackId
      ),
    [ownership]
  );

  return { ownership, addOwnership, ownsTrack };
}
