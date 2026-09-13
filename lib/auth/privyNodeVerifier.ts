import { PrivyClient, type VerifyAccessTokenResponse } from "@privy-io/node";
import {
  PRIVY_JWT_ISSUER,
  PrivyVerificationError,
  classifyPrivyError,
  type PrivyServerVerifier,
  type VerifiedPrivyClaim,
} from "./privyVerifier";

export type PrivyNodeAuth = {
  verifyAccessToken(accessToken: string): Promise<VerifyAccessTokenResponse>;
};

export type PrivyNodeClient = {
  utils(): { auth(): PrivyNodeAuth };
};

function mapClaim(raw: VerifyAccessTokenResponse, expectedAppId: string): VerifiedPrivyClaim {
  const appId = raw.app_id;
  const userId = raw.user_id;
  const issuer = raw.issuer;
  if (issuer !== PRIVY_JWT_ISSUER) {
    throw new PrivyVerificationError("INVALID_ISSUER");
  }
  if (appId !== expectedAppId) {
    throw new PrivyVerificationError("INVALID_AUDIENCE");
  }
  if (!userId?.trim()) {
    throw new PrivyVerificationError("INVALID_TOKEN");
  }
  return {
    appId,
    userId,
    issuer,
    issuedAt: raw.issued_at,
    expiration: raw.expiration,
    sessionId: raw.session_id,
  };
}

export function createPrivyNodeVerifier(options?: {
  appId?: string;
  appSecret?: string;
  jwtVerificationKey?: string;
  client?: PrivyNodeClient;
}): PrivyServerVerifier {
  const appId = options?.appId ?? process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
  const appSecret = options?.appSecret ?? process.env.PRIVY_APP_SECRET ?? "";
  const jwtVerificationKey =
    options?.jwtVerificationKey ?? process.env.PRIVY_JWT_VERIFICATION_KEY ?? undefined;

  const client =
    options?.client ??
    (appId && appSecret
      ? new PrivyClient({
          appId,
          appSecret,
          jwtVerificationKey,
        })
      : null);

  if (!client || !appId) {
    throw new Error("PRIVY_VERIFIER_UNAVAILABLE");
  }

  return {
    kind: "privy-node",
    async verifyAccessToken(accessToken: string) {
      if (!accessToken.trim()) {
        throw new PrivyVerificationError("INVALID_TOKEN");
      }
      try {
        const raw = await client.utils().auth().verifyAccessToken(accessToken);
        return mapClaim(raw, appId);
      } catch (error) {
        throw classifyPrivyError(error);
      }
    },
  };
}

export function isPrivyVerifierConfigured(): boolean {
  const appId = process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
  const appSecret = process.env.PRIVY_APP_SECRET ?? "";
  return Boolean(appId && appSecret);
}
