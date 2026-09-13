import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const ACTOR_SESSION_COOKIE = "moc_actor_session";
export const ACTOR_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type VerifiedActorSession = {
  actorRef: string;
  issuer: string;
  subject: string;
  expiresAt: string;
};

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueActorSession(
  input: {
    actorRef: string;
    issuer: string;
    subject: string;
    ttlMs?: number;
  },
  client: PrismaClient = getPrisma()
): Promise<{ token: string; session: VerifiedActorSession }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? ACTOR_SESSION_TTL_MS));
  await client.actorSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      actorRef: input.actorRef,
      issuer: input.issuer,
      subject: input.subject,
      expiresAt,
    },
  });
  return {
    token,
    session: {
      actorRef: input.actorRef,
      issuer: input.issuer,
      subject: input.subject,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

export function readSessionToken(request: NextRequest): string | null {
  const cookie = request.cookies.get(ACTOR_SESSION_COOKIE)?.value?.trim();
  if (cookie) return cookie;
  const header = request.headers.get("authorization")?.trim() ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  return null;
}

export async function resolveVerifiedActorSession(
  request: NextRequest,
  client: PrismaClient = getPrisma()
): Promise<VerifiedActorSession | { error: string; status: number }> {
  const token = readSessionToken(request);
  if (!token) {
    return { error: "UNAUTHENTICATED", status: 401 };
  }

  const row = await client.actorSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  });
  if (!row || row.revokedAt) {
    return { error: "UNAUTHENTICATED", status: 401 };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { error: "UNAUTHENTICATED", status: 401 };
  }

  const binding = await client.identityBinding.findUnique({
    where: {
      issuer_subject: { issuer: row.issuer, subject: row.subject },
    },
  });
  if (!binding) {
    return { error: "UNBOUND_SUBJECT", status: 401 };
  }
  if (binding.status !== "VIGENTE") {
    return { error: "BINDING_REVOKED", status: 401 };
  }
  if (binding.actorRef !== row.actorRef) {
    return { error: "SESSION_ACTOR_MISMATCH", status: 401 };
  }

  const claimed = request.headers.get("x-actor-ref")?.trim();
  if (claimed && claimed !== row.actorRef) {
    return { error: "FORBIDDEN", status: 403 };
  }

  return {
    actorRef: row.actorRef,
    issuer: row.issuer,
    subject: row.subject,
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function requireActorSession(
  request: NextRequest,
  client: PrismaClient = getPrisma()
): Promise<VerifiedActorSession | NextResponse> {
  const resolved = await resolveVerifiedActorSession(request, client);
  if ("error" in resolved) {
    return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
  }
  return resolved;
}

export function isActorSession(value: VerifiedActorSession | NextResponse): value is VerifiedActorSession {
  return !(value instanceof NextResponse);
}

export function actorSessionCookie(token: string, maxAgeSec = ACTOR_SESSION_TTL_MS / 1000) {
  return {
    name: ACTOR_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}
