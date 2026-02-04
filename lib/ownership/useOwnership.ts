"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "moc-owned-tracks";

export function useOwnership() {
  const [owned, setOwned] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setOwned(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addOwned = (trackId: string) => {
    setOwned((prev) => {
      const updated = [...new Set([...prev, trackId])];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { owned, addOwned };
}
