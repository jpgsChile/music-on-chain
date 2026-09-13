import { NextRequest, NextResponse } from "next/server";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import { createCBindEngine } from "@/lib/c-bind/engine";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import {
  PrivyVerificationError,
  authSubjectFromVerifiedClaim,
  readPrivyAccessToken,
} from "@/lib/auth/privyVerifier";
import { getPrivyVerifier } from "@/lib/auth/privyVerifierRuntime";

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
    return NextResponse.json({ ok: false, error: code }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_SUBJECT" }, { status: 400 });
  }

  const store = createPrismaCBindStore();
  const engine = createCBindEngine(store);
  const result = await engine.bind({
    authSubject,
    actorRef: typeof body.actorRef === "string" ? body.actorRef : "",
    proof: { sufficient: true },
    profileVersion: typeof body.profileVersion === "string" ? body.profileVersion : C_BIND_PROFILE,
    purpose: body.purpose,
  });

  const status = result.ok ? 200 : result.error === "CONFLICT" ? 409 : 400;
  return NextResponse.json(result, { status });
}
