"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import type { BindingView } from "@/lib/c-bind/types";

type SessionState = {
  loading: boolean;
  binding: BindingView | null;
  error: string | null;
};

export function useCBindSession(authenticated: boolean) {
  const { getAccessToken, user } = usePrivy();
  const [state, setState] = useState<SessionState>({
    loading: true,
    binding: null,
    error: null,
  });

  useEffect(() => {
    if (!authenticated) {
      setState({ loading: false, binding: null, error: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    void (async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (!cancelled) {
            setState({ loading: false, binding: null, error: "UNAUTHENTICATED" });
          }
          return;
        }
        const res = await fetch("/api/identity/session", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            profileVersion: C_BIND_PROFILE,
            walletAddress: user?.wallet?.address ?? null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!data?.ok) {
          setState({
            loading: false,
            binding: null,
            error: typeof data.error === "string" ? data.error : "UNAUTHENTICATED",
          });
          return;
        }
        setState({ loading: false, binding: data.value as BindingView, error: null });
      } catch {
        if (!cancelled) {
          setState({ loading: false, binding: null, error: "UNAUTHENTICATED" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, getAccessToken, user?.id, user?.wallet?.address]);

  return state;
}
