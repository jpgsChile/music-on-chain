"use client";

import { useEffect, useState } from "react";
import { authSubjectFromPrivy } from "@/lib/c-bind/fromPrivy";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import type { BindingView } from "@/lib/c-bind/types";

type PrivyLikeUser = {
  id?: string | null;
  wallet?: { address?: string | null } | null;
};

type SessionState = {
  loading: boolean;
  binding: BindingView | null;
  error: string | null;
};

export function useCBindSession(user: PrivyLikeUser | null, authenticated: boolean) {
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

    const authSubject = authSubjectFromPrivy(user);
    if (!authSubject) {
      setState({ loading: false, binding: null, error: "INVALID_SUBJECT" });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch("/api/identity/session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authSubject,
        proof: { sufficient: true },
        profileVersion: C_BIND_PROFILE,
        walletAddress: user?.wallet?.address ?? null,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!data?.ok) {
          setState({
            loading: false,
            binding: null,
            error: typeof data.error === "string" ? data.error : "INVALID_PROOF",
          });
          return;
        }
        setState({ loading: false, binding: data.value as BindingView, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ loading: false, binding: null, error: "INVALID_PROOF" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, user?.id]);

  return state;
}
