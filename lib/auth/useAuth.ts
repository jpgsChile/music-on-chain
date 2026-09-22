"use client";

import { usePrivy } from "@privy-io/react-auth";

export function useAuth() {
  const { ready, authenticated, login, logout: privyLogout, user } = usePrivy();

  async function logout() {
    await fetch("/api/identity/session", { method: "DELETE", credentials: "include" }).catch(() => undefined);
    await privyLogout();
  }

  return {
    ready,
    authenticated,
    login,
    logout,
    user,
  };
}
