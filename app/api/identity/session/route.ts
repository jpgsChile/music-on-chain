import { NextRequest, NextResponse } from "next/server";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { provisionThenBind } from "@/lib/c-bind/session";
import { parseAuthSubject } from "@/lib/c-bind/authSubject";
import { attachWalletToActor } from "@/lib/domain/actorWallet";
import { claimOrphanProfile } from "@/lib/artist-profile/repository";
import {
  actorSessionCookie,
  issueActorSession,
  isActorSession,
  requireActorSession,
} from "@/lib/auth/actorSession";
import { logDomainEvent } from "@/lib/observability/domainLog";

/**
 * MOC session: authenticate with Privy on the client, then provision Actor if needed and Bind.
 * Proof `{ sufficient: true }` is a local stand-in after Privy authentication (C-BIND D02).
 * FUTURE WORK: verify Privy tokens server-side.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_SUBJECT" }, { status: 400 });
  }

  const subject = parseAuthSubject(body.authSubject);
  if (!subject.ok) {
    return NextResponse.json(subject, { status: 400 });
  }

  if (subject.value.issuer !== PRIVY_ISSUER) {
    return NextResponse.json({ ok: false, error: "INVALID_ISSUER" }, { status: 400 });
  }

  const proof = body.proof;
  if (!proof || typeof proof !== "object" || (proof as { sufficient?: unknown }).sufficient !== true) {
    return NextResponse.json({ ok: false, error: "INVALID_PROOF" }, { status: 400 });
  }

  const store = createPrismaCBindStore();
  const result = await provisionThenBind(store, {
    authSubject: subject.value,
    proof: { sufficient: true },
    profileVersion: typeof body.profileVersion === "string" ? body.profileVersion : C_BIND_PROFILE,
  });

  if (!result.ok) {
    const status = result.error === "CONFLICT" ? 409 : 400;
    return NextResponse.json(result, { status });
  }

  const walletAddress =
    typeof body.walletAddress === "string" ? body.walletAddress : null;
  await attachWalletToActor(result.value.actorRef, walletAddress);
  await claimOrphanProfile(result.value.actorRef, walletAddress);

  const issued = await issueActorSession({
    actorRef: result.value.actorRef,
    issuer: subject.value.issuer,
    subject: subject.value.subject,
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
