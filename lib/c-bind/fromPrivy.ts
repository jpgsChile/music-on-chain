import type { AuthSubject } from "./types";

/** MOC-local issuer namespace. Not prescribed by C-BIND/1. */
export const PRIVY_ISSUER = "privy" as const;

type PrivyLikeUser = {
  id?: string | null;
  wallet?: { address?: string | null } | null;
  linkedAccounts?: Array<{ address?: string | null; type?: string | null }> | null;
};

/**
 * Build AuthSubject from an authenticated Privy user.
 * Uses Privy subject id, never a wallet address.
 */
export function authSubjectFromPrivy(user: PrivyLikeUser | null | undefined): AuthSubject | null {
  const subject = user?.id?.trim();
  if (!subject) return null;
  return { issuer: PRIVY_ISSUER, subject };
}

export function looksLikeEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
