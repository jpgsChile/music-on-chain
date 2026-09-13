import { afterEach, describe, expect, it } from "vitest";
import { createPrivyNodeVerifier } from "@/lib/auth/privyNodeVerifier";
import { PrivyVerificationError } from "@/lib/auth/privyVerifier";
import { authSubjectFromVerifiedClaim } from "@/lib/auth/privyVerifier";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";
import type { VerifyAccessTokenResponse } from "@privy-io/node";

function sdkClaim(overrides?: Partial<VerifyAccessTokenResponse>): VerifyAccessTokenResponse {
  const now = Math.floor(Date.now() / 1000);
  return {
    app_id: "app-test",
    issuer: "privy.io",
    issued_at: now - 5,
    expiration: now + 3600,
    session_id: "sid",
    user_id: "did:privy:verified-user",
    ...overrides,
  };
}

describe("PrivyNodeVerifier (official SDK wiring)", () => {
  it("kind is privy-node, not mock", () => {
    const verifier = createPrivyNodeVerifier({
      appId: "app-test",
      appSecret: "secret",
      client: {
        utils: () => ({
          auth: () => ({
            verifyAccessToken: async () => sdkClaim(),
          }),
        }),
      },
    });
    expect(verifier.kind).toBe("privy-node");
  });

  it("TEST 1: valid SDK result becomes AuthSubject.subject, not ActorRef", async () => {
    let received: string | undefined;
    const verifier = createPrivyNodeVerifier({
      appId: "app-test",
      appSecret: "secret",
      client: {
        utils: () => ({
          auth: () => ({
            verifyAccessToken: async (token: string) => {
              received = token;
              return sdkClaim();
            },
          }),
        }),
      },
    });
    const claim = await verifier.verifyAccessToken("real-access-token");
    expect(received).toBe("real-access-token");
    const subject = authSubjectFromVerifiedClaim(claim);
    expect(subject).toEqual({ issuer: PRIVY_ISSUER, subject: "did:privy:verified-user" });
    expect(subject.subject).not.toMatch(/^moc:actor:/);
  });

  it("TEST 2: SDK rejection is INVALID_TOKEN", async () => {
    const verifier = createPrivyNodeVerifier({
      appId: "app-test",
      appSecret: "secret",
      client: {
        utils: () => ({
          auth: () => ({
            verifyAccessToken: async () => {
              throw new Error("invalid token");
            },
          }),
        }),
      },
    });
    await expect(verifier.verifyAccessToken("nope")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  });

  it("TEST 3: signature failure is TAMPERED_TOKEN", async () => {
    const verifier = createPrivyNodeVerifier({
      appId: "app-test",
      appSecret: "secret",
      client: {
        utils: () => ({
          auth: () => ({
            verifyAccessToken: async () => {
              throw new Error("signature verification failed");
            },
          }),
        }),
      },
    });
    await expect(verifier.verifyAccessToken("aaaa.bbbb.cccc")).rejects.toBeInstanceOf(
      PrivyVerificationError
    );
    await expect(verifier.verifyAccessToken("aaaa.bbbb.cccc")).rejects.toMatchObject({
      code: "TAMPERED_TOKEN",
    });
  });

  it("TEST 4: expired token from SDK is EXPIRED_TOKEN", async () => {
    const verifier = createPrivyNodeVerifier({
      appId: "app-test",
      appSecret: "secret",
      client: {
        utils: () => ({
          auth: () => ({
            verifyAccessToken: async () => {
              throw new Error("token expired");
            },
          }),
        }),
      },
    });
    await expect(verifier.verifyAccessToken("old")).rejects.toMatchObject({ code: "EXPIRED_TOKEN" });
  });

  it("rejects JWT issuer other than privy.io", async () => {
    const verifier = createPrivyNodeVerifier({
      appId: "app-test",
      appSecret: "secret",
      client: {
        utils: () => ({
          auth: () => ({
            verifyAccessToken: async () => sdkClaim({ issuer: "evil.example" }),
          }),
        }),
      },
    });
    await expect(verifier.verifyAccessToken("tok")).rejects.toMatchObject({ code: "INVALID_ISSUER" });
  });

  it("rejects audience mismatch", async () => {
    const verifier = createPrivyNodeVerifier({
      appId: "app-test",
      appSecret: "secret",
      client: {
        utils: () => ({
          auth: () => ({
            verifyAccessToken: async () => sdkClaim({ app_id: "other-app" }),
          }),
        }),
      },
    });
    await expect(verifier.verifyAccessToken("tok")).rejects.toMatchObject({
      code: "INVALID_AUDIENCE",
    });
  });
});
