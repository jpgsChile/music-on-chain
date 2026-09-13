import { PrivyVerificationError, type PrivyServerVerifier, type VerifiedPrivyClaim } from "./privyVerifier";

export type MockPrivyTokenState = "valid" | "invalid" | "expired" | "tampered";

/**
 * Test-only verifier. Does not check JWT signatures.
 * Production must use createPrivyNodeVerifier.
 */
export function createMockPrivyVerifier(options?: {
  subjects?: Record<string, string>;
  appId?: string;
}): PrivyServerVerifier {
  const subjects = options?.subjects ?? {};
  const appId = options?.appId ?? "test-app";

  return {
    kind: "mock",
    async verifyAccessToken(accessToken: string) {
      if (accessToken === "expired" || accessToken.startsWith("expired:")) {
        throw new PrivyVerificationError("EXPIRED_TOKEN");
      }
      if (accessToken === "tampered" || accessToken.startsWith("tampered:")) {
        throw new PrivyVerificationError("TAMPERED_TOKEN");
      }
      if (accessToken === "invalid" || !accessToken.trim()) {
        throw new PrivyVerificationError("INVALID_TOKEN");
      }
      const mapped = subjects[accessToken];
      const userId = mapped ?? (accessToken.startsWith("valid:") ? accessToken.slice(6) : null);
      if (!userId) {
        throw new PrivyVerificationError("INVALID_TOKEN");
      }
      const now = Math.floor(Date.now() / 1000);
      const claim: VerifiedPrivyClaim = {
        appId,
        userId,
        issuer: "privy.io",
        issuedAt: now - 10,
        expiration: now + 3600,
        sessionId: "mock-session",
      };
      return claim;
    },
  };
}
