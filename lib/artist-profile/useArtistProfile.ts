"use client";

import { useState, useEffect, useCallback } from "react";
import type { ArtistProfileRecord } from "./types";

const API = "/api/artist/profile";

export function useArtistProfile(wallet: string | undefined, actorRef?: string) {
  const [profile, setProfile] = useState<ArtistProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!wallet?.trim() && !actorRef?.trim()) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (wallet?.trim()) headers["x-artist-wallet"] = wallet;
      if (actorRef?.trim()) headers["x-actor-ref"] = actorRef;
      const res = await fetch(API, { headers, credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load profile");
      }
      const data = await res.json();
      setProfile(data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [wallet, actorRef]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (payload: {
      artisticName?: string | null;
      country?: string | null;
      username?: string | null;
      biography?: string | null;
      bannerUrl?: string | null;
      avatarUrl?: string | null;
      socials?: Record<string, string>;
      creativeRoles?: string[];
      defaultRoyaltySplits?: { role: string; percentage: number }[];
    }) => {
      if (!actorRef?.trim()) throw new Error("Actor required");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (wallet?.trim()) headers["x-artist-wallet"] = wallet;
      if (actorRef?.trim()) headers["x-actor-ref"] = actorRef;
      const res = await fetch(API, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save profile");
      setProfile(data);
      return data as ArtistProfileRecord;
    },
    [wallet, actorRef]
  );

  return { profile, loading, error, refresh: fetchProfile, saveProfile };
}

/** Public fetch by wallet (for artist page / fan view). */
export function useArtistProfilePublic(wallet: string | undefined) {
  const [profile, setProfile] = useState<ArtistProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet?.trim()) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/artist/profile/${encodeURIComponent(wallet)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data ?? null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [wallet]);

  return { profile, loading };
}
