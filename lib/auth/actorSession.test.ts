import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { createCBindEngine } from "@/lib/c-bind/engine";
import { provisionThenBind } from "@/lib/c-bind/session";
import { attachWalletToActor } from "@/lib/domain/actorWallet";
import {
  issueActorSession,
  resolveVerifiedActorSession,
} from "@/lib/auth/actorSession";
import { GET as getEntitlements } from "@/app/api/economics/entitlements/route";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";
import type { PrismaClient } from "@prisma/client";

const PROOF = { sufficient: true as const };

async function bindSubject(
  client: PrismaClient,
  subject: string,
  actorRef?: string
) {
  const store = createPrismaCBindStore(client);
  if (actorRef) {
    if (!(await store.hasActor(actorRef))) await store.addActor(actorRef);
    const engine = createCBindEngine(store);
    return engine.bind({
      authSubject: { issuer: PRIVY_ISSUER, subject },
      actorRef,
      proof: PROOF,
      profileVersion: C_BIND_PROFILE,
    });
  }
  return provisionThenBind(store, {
    authSubject: { issuer: PRIVY_ISSUER, subject },
    proof: PROOF,
  });
}

function requestWithBearer(token?: string, extra?: Record<string, string>) {
  const headers = new Headers(extra);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest("http://localhost/api/economics/entitlements", { headers });
}

describe("Verified Actor session", { timeout: 20_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("SESSION-01 authenticated bound actor is allowed", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const bound = await bindSubject(client, "did:privy:session-01");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const issued = await issueActorSession(
      { actorRef: bound.value.actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:session-01" },
      client
    );
    const resolved = await resolveVerifiedActorSession(requestWithBearer(issued.token), client);
    expect("actorRef" in resolved && resolved.actorRef).toBe(bound.value.actorRef);
    const res = await getEntitlements(requestWithBearer(issued.token));
    expect(res.status).toBe(200);
  });

  it("SESSION-02 actor A cannot access actor B", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const a = await bindSubject(client, "did:privy:a");
    const b = await bindSubject(client, "did:privy:b");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const issued = await issueActorSession(
      { actorRef: a.value.actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:a" },
      client
    );
    const res = await getEntitlements(
      requestWithBearer(issued.token, { "x-actor-ref": b.value.actorRef })
    );
    expect(res.status).toBe(403);
    const other = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?actorRef=${encodeURIComponent(b.value.actorRef)}`, {
        headers: { authorization: `Bearer ${issued.token}` },
      })
    );
    expect(other.status).toBe(403);
  });

  it("SESSION-03 missing session is rejected", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const res = await getEntitlements(requestWithBearer());
    expect(res.status).toBe(401);
  });

  it("SESSION-04 unbound subject is rejected", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const issued = await issueActorSession(
      {
        actorRef: "moc:actor:unbound-real",
        issuer: PRIVY_ISSUER,
        subject: "did:privy:never-bound",
      },
      client
    );
    const resolved = await resolveVerifiedActorSession(requestWithBearer(issued.token), client);
    expect("error" in resolved && resolved.error).toBe("UNBOUND_SUBJECT");
  });

  it("SESSION-05 revoked binding is rejected", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const bound = await bindSubject(client, "did:privy:revoked");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const issued = await issueActorSession(
      { actorRef: bound.value.actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:revoked" },
      client
    );
    const engine = createCBindEngine(createPrismaCBindStore(client));
    const revoked = await engine.revoke({
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:revoked" },
      actorRef: bound.value.actorRef,
      profileVersion: C_BIND_PROFILE,
    });
    expect(revoked.ok).toBe(true);
    const resolved = await resolveVerifiedActorSession(requestWithBearer(issued.token), client);
    expect("error" in resolved && resolved.error).toBe("BINDING_REVOKED");
    const res = await getEntitlements(requestWithBearer(issued.token));
    expect(res.status).toBe(401);
  });

  it("SESSION-06 a different wallet does not change Actor", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const bound = await bindSubject(client, "did:privy:wallet");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    await attachWalletToActor(bound.value.actorRef, "0x1111111111111111111111111111111111111111");
    const issued = await issueActorSession(
      { actorRef: bound.value.actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:wallet" },
      client
    );
    await attachWalletToActor(bound.value.actorRef, "0x2222222222222222222222222222222222222222");
    const resolved = await resolveVerifiedActorSession(requestWithBearer(issued.token), client);
    expect("actorRef" in resolved && resolved.actorRef).toBe(bound.value.actorRef);
    expect(resolved && "actorRef" in resolved && resolved.actorRef).not.toBe(
      "0x2222222222222222222222222222222222222222"
    );
  });

  it("SESSION-07 concurrent first login keeps one binding and one wallet", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const subject = "did:privy:race";
    const wallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const store = createPrismaCBindStore(client);
    const [a, b] = await Promise.all([
      provisionThenBind(store, {
        authSubject: { issuer: PRIVY_ISSUER, subject },
        proof: PROOF,
      }),
      provisionThenBind(store, {
        authSubject: { issuer: PRIVY_ISSUER, subject },
        proof: PROOF,
      }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.value.actorRef).toBe(a.value.actorRef);
    await Promise.all([
      attachWalletToActor(a.value.actorRef, wallet),
      attachWalletToActor(b.value.actorRef, wallet),
    ]);
    expect(await client.identityBinding.count()).toBe(1);
    expect(await client.actorWallet.count()).toBe(1);
    const walletRow = await client.actorWallet.findFirst();
    expect(walletRow?.actorRef).toBe(a.value.actorRef);
  });

  it("SESSION-08 a wallet left on an unbound actor follows the binding", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const wallet = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const bound = await bindSubject(client, "did:privy:bound");
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const stray = "moc:actor:stray-session";
    await client.actor.create({ data: { actorRef: stray } });
    await client.actorWallet.create({ data: { actorRef: stray, address: wallet } });
    await issueActorSession(
      { actorRef: stray, issuer: PRIVY_ISSUER, subject: "did:privy:bound" },
      client
    );

    const moved = await attachWalletToActor(bound.value.actorRef, wallet);
    expect(moved.result).toBe("ok");
    const row = await client.actorWallet.findUnique({ where: { address: wallet } });
    expect(row?.actorRef).toBe(bound.value.actorRef);
    expect(await client.actor.findUnique({ where: { actorRef: stray } })).toBeNull();

    const other = await bindSubject(client, "did:privy:other");
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    const stolen = await attachWalletToActor(other.value.actorRef, wallet);
    expect(stolen.result).toBe("conflict");
    const kept = await client.actorWallet.findUnique({ where: { address: wallet } });
    expect(kept?.actorRef).toBe(bound.value.actorRef);
  });
});
