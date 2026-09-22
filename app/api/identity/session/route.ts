import { NextRequest, NextResponse } from "next/server";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { provisionThenBind } from "@/lib/c-bind/session";
import { attachWalletToActor } from "@/lib/domain/actorWallet";
import { claimOrphanProfile } from "@/lib/artist-profile/repository";
import {
  actorSessionCookie,
  clearActorSessionCookie,
  issueActorSession,
  isActorSession,
  readSessionToken,
  requireActorSession,
  revokeActorSessionToken,
} from "@/lib/auth/actorSession";
import {
  PrivyVerificationError,
  authSubjectFromVerifiedClaim,
  readPrivyAccessToken,
} from "@/lib/auth/privyVerifier";
import { getPrivyVerifier } from "@/lib/auth/privyVerifierRuntime";
import { logDomainEvent } from "@/lib/observability/domainLog";

/**
 * MOC session: verify Privy access token server-side, then provision Actor if needed and Bind.
 * C-BIND proof sufficiency is applied only after cryptographic verification of the Privy token.
 */
export async function POST(request: NextRequest) {
  const accessToken = readPrivyAccessToken(request.headers.get("authorization"));
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let verifier;
  try {
    verifier = getPrivyVerifier();
  } catch {
    return NextResponse.json({ ok: false, error: "PRIVY_VERIFIER_UNAVAILABLE" }, { status: 503 });
  }

  let authSubject;
  try {
    const claim = await verifier.verifyAccessToken(accessToken);
    authSubject = authSubjectFromVerifiedClaim(claim);
  } catch (error) {
    const code = error instanceof PrivyVerificationError ? error.code : "INVALID_TOKEN";
    logDomainEvent("privy.verify.failed", { code });
    return NextResponse.json({ ok: false, error: code }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const store = createPrismaCBindStore();
  const result = await provisionThenBind(store, {
    authSubject,
    proof: { sufficient: true },
    profileVersion:
      body && typeof body === "object" && typeof body.profileVersion === "string"
        ? body.profileVersion
        : C_BIND_PROFILE,
  });

  if (!result.ok) {
    const status = result.error === "CONFLICT" ? 409 : 400;
    return NextResponse.json(result, { status });
  }

  const walletAddress =
    body && typeof body === "object" && typeof body.walletAddress === "string"
      ? body.walletAddress
      : null;
  await attachWalletToActor(result.value.actorRef, walletAddress);
  await claimOrphanProfile(result.value.actorRef, walletAddress);

  const issued = await issueActorSession({
    actorRef: result.value.actorRef,
    issuer: authSubject.issuer,
    subject: authSubject.subject,
  });
  const cookie = actorSessionCookie(issued.token);
  const response = NextResponse.json(
    {
      ok: true,
      value: {
        ...result.value,
        walletAddress: walletAddress?.trim().toLowerCase() || null,
        actorRef: issued.session.actorRef,
      },
    },
    { status: 200 }
  );
  response.cookies.set(cookie);
  logDomainEvent("actor.session.issued", { actorRef: issued.session.actorRef });
  return response;
}

export async function GET(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  return NextResponse.json({
    ok: true,
    value: {
      actorRef: session.actorRef,
      issuer: session.issuer,
      subject: session.subject,
      expiresAt: session.expiresAt,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const token = readSessionToken(request);
  if (token) await revokeActorSessionToken(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearActorSessionCookie());
  return response;
}
