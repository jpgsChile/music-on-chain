import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { POST as postSession, DELETE as deleteSession } from "@/app/api/identity/session/route";
import { GET as getEntitlements } from "@/app/api/economics/entitlements/route";
import { createCBindEngine } from "@/lib/c-bind/engine";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { provisionThenBind } from "@/lib/c-bind/session";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";
import { issueActorSession } from "@/lib/auth/actorSession";
import { createMockPrivyVerifier } from "@/lib/auth/mockPrivyVerifier";
import { setPrivyVerifierForTests } from "@/lib/auth/privyVerifierRuntime";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";
import type { PrismaClient } from "@prisma/client";

describe("POST /api/identity/session Privy hardening", { timeout: 20_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    setPrivyVerifierForTests(null);
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  async function openDb() {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    return db.client;
  }

  it("TEST 1: valid token creates session with C-BIND ActorRef", async () => {
    await openDb();
    setPrivyVerifierForTests(
      createMockPrivyVerifier({ subjects: { "valid-token": "did:privy:alice" } })
    );
    const res = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.value.actorRef).toMatch(/^moc:actor:/);
    expect(data.value.actorRef).not.toBe("did:privy:alice");
    expect(res.cookies.get("moc_actor_session")?.value).toBeTruthy();
  });

  it("TEST 2: invalid token is 401", async () => {
    await openDb();
    setPrivyVerifierForTests(createMockPrivyVerifier());
    const res = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: { authorization: "Bearer invalid", "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
  });

  it("TEST 3: tampered token is 401", async () => {
    await openDb();
    setPrivyVerifierForTests(createMockPrivyVerifier());
    const res = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: { authorization: "Bearer tampered:x", "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("TAMPERED_TOKEN");
  });

  it("TEST 4: expired token is 401", async () => {
    await openDb();
    setPrivyVerifierForTests(createMockPrivyVerifier());
    const res = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: { authorization: "Bearer expired", "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("EXPIRED_TOKEN");
  });

  it("TEST 5: client authSubject without token is 401", async () => {
    await openDb();
    setPrivyVerifierForTests(createMockPrivyVerifier());
    const res = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:spoof" },
          proof: { sufficient: true },
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("TEST 5b: client authSubject is ignored when token is valid", async () => {
    await openDb();
    setPrivyVerifierForTests(
      createMockPrivyVerifier({ subjects: { "valid-token": "did:privy:alice" } })
    );
    const res = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:other-user" },
          proof: { sufficient: true },
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const store = createPrismaCBindStore(client!);
    const binding = await store.getByAuthSubject(PRIVY_ISSUER, "did:privy:alice");
    expect(binding?.actorRef).toBe(data.value.actorRef);
    const spoof = await store.getByAuthSubject(PRIVY_ISSUER, "did:privy:other-user");
    expect(spoof).toBeNull();
  });

  it("TEST 6: x-actor-ref of another Actor is 403", async () => {
    const db = await openDb();
    const store = createPrismaCBindStore(db);
    const a = await provisionThenBind(store, {
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:a" },
      proof: { sufficient: true },
    });
    const b = await provisionThenBind(store, {
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:b" },
      proof: { sufficient: true },
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const issued = await issueActorSession(
      { actorRef: a.value.actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:a" },
      db
    );
    const res = await getEntitlements(
      new NextRequest("http://localhost/api/economics/entitlements", {
        headers: {
          authorization: `Bearer ${issued.token}`,
          "x-actor-ref": b.value.actorRef,
        },
      })
    );
    expect(res.status).toBe(403);
  });

  it("TEST 7: revoked binding rejects session APIs", async () => {
    const db = await openDb();
    setPrivyVerifierForTests(
      createMockPrivyVerifier({ subjects: { "valid-token": "did:privy:revoked" } })
    );
    const created = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      })
    );
    expect(created.status).toBe(200);
    const cookie = created.cookies.get("moc_actor_session")?.value;
    const data = await created.json();
    const engine = createCBindEngine(createPrismaCBindStore(db));
    await engine.revoke({
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:revoked" },
      actorRef: data.value.actorRef,
      profileVersion: C_BIND_PROFILE,
    });
    const res = await getEntitlements(
      new NextRequest("http://localhost/api/economics/entitlements", {
        headers: { cookie: `moc_actor_session=${cookie}` },
      })
    );
    expect(res.status).toBe(401);
  });

  it("TEST 8: Actor A cannot operate as Actor B", async () => {
    const db = await openDb();
    const store = createPrismaCBindStore(db);
    const a = await provisionThenBind(store, {
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:aa" },
      proof: { sufficient: true },
    });
    const b = await provisionThenBind(store, {
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:bb" },
      proof: { sufficient: true },
    });
    if (!a.ok || !b.ok) return;
    const issued = await issueActorSession(
      { actorRef: a.value.actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:aa" },
      db
    );
    const res = await getEntitlements(
      new NextRequest(
        `http://localhost/api/economics/entitlements?actorRef=${encodeURIComponent(b.value.actorRef)}`,
        { headers: { authorization: `Bearer ${issued.token}` } }
      )
    );
    expect(res.status).toBe(403);
  });

  it("clears the Actor session cookie on logout", async () => {
    await openDb();
    setPrivyVerifierForTests(
      createMockPrivyVerifier({ subjects: { "valid-token": "did:privy:logout" } })
    );
    const created = await postSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      })
    );
    const cookie = created.cookies.get("moc_actor_session")?.value;
    expect(cookie).toBeTruthy();
    const cleared = await deleteSession(
      new NextRequest("http://localhost/api/identity/session", {
        method: "DELETE",
        headers: { cookie: `moc_actor_session=${cookie}` },
      })
    );
    expect(cleared.status).toBe(200);
    expect(cleared.cookies.get("moc_actor_session")?.value).toBe("");
    const after = await getEntitlements(
      new NextRequest("http://localhost/api/economics/entitlements", {
        headers: { cookie: `moc_actor_session=${cookie}` },
      })
    );
    expect(after.status).toBe(401);
  });

  it("TEST 9: concurrent first login returns the same Actor", async () => {
    const db = await openDb();
    setPrivyVerifierForTests(
      createMockPrivyVerifier({ subjects: { "race-token": "did:privy:race" } })
    );
    const wallet = "0xcccccccccccccccccccccccccccccccccccccccc";
    const call = () =>
      postSession(
        new NextRequest("http://localhost/api/identity/session", {
          method: "POST",
          headers: {
            authorization: "Bearer race-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({ walletAddress: wallet }),
        })
      );
    const [first, second] = await Promise.all([call(), call()]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const a = await first.json();
    const b = await second.json();
    expect(a.ok && b.ok).toBe(true);
    expect(b.value.actorRef).toBe(a.value.actorRef);
    expect(await db.identityBinding.count()).toBe(1);
    const wallets = await db.actorWallet.findMany();
    expect(wallets).toHaveLength(1);
    expect(wallets[0]?.actorRef).toBe(a.value.actorRef);
  });

  it("TEST 10: a second sequential login keeps the same Actor", async () => {
    const db = await openDb();
    setPrivyVerifierForTests(
      createMockPrivyVerifier({ subjects: { "again-token": "did:privy:again" } })
    );
    const call = () =>
      postSession(
        new NextRequest("http://localhost/api/identity/session", {
          method: "POST",
          headers: {
            authorization: "Bearer again-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
          }),
        })
      );
    const first = await call();
    const second = await call();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const a = await first.json();
    const b = await second.json();
    expect(b.value.actorRef).toBe(a.value.actorRef);
    expect(await db.actor.count()).toBe(1);
    expect(await db.identityBinding.count()).toBe(1);
    expect(await db.actorWallet.count()).toBe(1);
    const binding = await db.identityBinding.findFirst();
    expect(binding?.actorRef).toBe(a.value.actorRef);
  });
});
