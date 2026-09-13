import type { AuthSubject } from "@/lib/c-bind/types";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";

export const PRIVY_JWT_ISSUER = "privy.io";

export type VerifiedPrivyClaim = {
  appId: string;
  userId: string;
  issuer: string;
  issuedAt: number;
  expiration: number;
  sessionId: string;
};

export type PrivyVerificationFailure = {
  code: "INVALID_TOKEN" | "EXPIRED_TOKEN" | "TAMPERED_TOKEN" | "INVALID_ISSUER" | "INVALID_AUDIENCE";
};

export class PrivyVerificationError extends Error {
  readonly code: PrivyVerificationFailure["code"];
  constructor(code: PrivyVerificationFailure["code"], message = code) {
    super(message);
    this.name = "PrivyVerificationError";
    this.code = code;
  }
}

/**
 * Production verifier uses the official Privy Node SDK (signature + iss + aud + exp).
 * Tests inject MockPrivyVerifier — never the production class.
 */
export type PrivyServerVerifier = {
  readonly kind: "privy-node" | "mock";
  verifyAccessToken(accessToken: string): Promise<VerifiedPrivyClaim>;
};

export function authSubjectFromVerifiedClaim(claim: VerifiedPrivyClaim): AuthSubject {
  if (claim.issuer !== PRIVY_JWT_ISSUER) {
    throw new PrivyVerificationError("INVALID_ISSUER");
  }
  if (!claim.userId.trim()) {
    throw new PrivyVerificationError("INVALID_TOKEN");
  }
  return {
    issuer: PRIVY_ISSUER,
    subject: claim.userId.trim(),
  };
}

export function readPrivyAccessToken(authorizationHeader: string | null): string | null {
  const header = authorizationHeader?.trim() ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function classifyPrivyError(error: unknown): PrivyVerificationError {
  if (error instanceof PrivyVerificationError) return error;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("expir")) return new PrivyVerificationError("EXPIRED_TOKEN");
  if (message.includes("signature") || message.includes("tamper") || message.includes("malform")) {
    return new PrivyVerificationError("TAMPERED_TOKEN");
  }
  return new PrivyVerificationError("INVALID_TOKEN");
}
