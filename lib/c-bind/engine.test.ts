import { describe, expect, it } from "vitest";
import { C_BIND_CDR, C_BIND_PIN, C_BIND_PROFILE, C_BIND_RELEASE } from "./contract";
import { createCBindEngine } from "./engine";
import { authSubjectFromPrivy, looksLikeEvmAddress } from "./fromPrivy";
import { parseAuthSubject } from "./authSubject";
import { provisionThenBind } from "./session";
import { createMemoryStore, provisionMocActor } from "./store";
import type { StoredBinding } from "./types";

const PROOF = { sufficient: true };
const PROFILE = C_BIND_PROFILE;
const AS_OF = "2026-01-01T00:00:00.000Z";

function binding(partial: {
  issuer: string;
  subject: string;
  actorRef: string;
  status: StoredBinding["status"];
}): StoredBinding {
  return { ...partial, asOf: AS_OF };
}

function engineFrom(setup: { actors?: string[]; bindings?: StoredBinding[] }) {
  const store = createMemoryStore(setup);
  const engine = createCBindEngine(store, () => "2026-06-01T00:00:00.000Z");
  return { store, engine };
}

describe("C-BIND/1 pin", () => {
  it("identifies C-BIND/1 release 1.0.0 and CDR-008", () => {
    expect(C_BIND_PIN).toMatchObject({
      profile: "C-BIND/1",
      release: "1.0.0",
      cdr: "CDR-008",
      status: "ACCEPTED",
    });
    expect(C_BIND_PROFILE).toBe("C-BIND/1");
    expect(C_BIND_RELEASE).toBe("1.0.0");
    expect(C_BIND_CDR).toBe("CDR-008");
  });
});

describe("1. AuthSubject formation", () => {
  it("is issuer + subject only", () => {
    const parsed = parseAuthSubject({ issuer: "privy", subject: "did:privy:abc" });
    expect(parsed).toEqual({
      ok: true,
      value: { issuer: "privy", subject: "did:privy:abc" },
    });
  });

  it("does not treat a wallet address as AuthSubject by itself", () => {
    expect(parseAuthSubject("0x1111111111111111111111111111111111111111").ok).toBe(false);
  });
});

describe("2. Initial Bind", () => {
  it("G01 binds an existing Actor to VIGENTE without creating actors", async () => {
    const { store, engine } = engineFrom({ actors: ["actor-1"] });
    const before = await store.listActors();
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result).toEqual({
      ok: true,
      value: {
        actorRef: "actor-1",
        bindingStatus: "VIGENTE",
        asOf: "2026-06-01T00:00:00.000Z",
        profileVersion: "C-BIND/1",
      },
    });
    expect(await store.listActors()).toEqual(before);
  });
});

describe("3. Bind retry is idempotent", () => {
  it("G02 retry ≠ rebind: same Binding, same ActorRef, no new Actor", async () => {
    const { store, engine } = engineFrom({
      actors: ["actor-1"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "VIGENTE",
        }),
      ],
    });
    const before = await store.listActors();
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.actorRef).toBe("actor-1");
      expect(result.value.bindingStatus).toBe("VIGENTE");
      expect(result.value.asOf).toBe(AS_OF);
    }
    expect(await store.listActors()).toEqual(before);
  });

  it("G03 purpose is outside BindingContext: still retry", async () => {
    const { engine } = engineFrom({
      actors: ["actor-1"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "VIGENTE",
        }),
      ],
    });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: PROOF,
      profileVersion: PROFILE,
      purpose: "other-purpose",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.asOf).toBe(AS_OF);
      expect(result.value.actorRef).toBe("actor-1");
    }
  });
});

describe("4. Second AuthSubject on the same ActorRef is CONFLICT", () => {
  it("N03 second vigente AuthSubject → CONFLICT (no linking)", async () => {
    const { engine } = engineFrom({
      actors: ["actor-1"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "VIGENTE",
        }),
      ],
    });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-b", subject: "sub-2" },
      actorRef: "actor-1",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result).toEqual({ ok: false, error: "CONFLICT" });
  });

  it("N04 same AuthSubject to another ActorRef → CONFLICT", async () => {
    const { engine } = engineFrom({
      actors: ["actor-1", "actor-2"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "VIGENTE",
        }),
      ],
    });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-2",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result).toEqual({ ok: false, error: "CONFLICT" });
  });
});

describe("5. Resolve VIGENTE", () => {
  it("returns BindingView VIGENTE", async () => {
    const { engine } = engineFrom({
      actors: ["actor-1"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "VIGENTE",
        }),
      ],
    });
    const result = await engine.resolve({ actorRef: "actor-1", profileVersion: PROFILE });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.bindingStatus).toBe("VIGENTE");
      expect(result.value.actorRef).toBe("actor-1");
      expect(result.value.profileVersion).toBe("C-BIND/1");
    }
  });
});

describe("6. Revocation", () => {
  it("G05 sets REVOCADO and keeps the Actor", async () => {
    const { store, engine } = engineFrom({
      actors: ["actor-1"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "VIGENTE",
        }),
      ],
    });
    const result = await engine.revoke({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      profileVersion: PROFILE,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.bindingStatus).toBe("REVOCADO");
      expect(result.value.actorRef).toBe("actor-1");
    }
    expect(await store.hasActor("actor-1")).toBe(true);
    expect(await store.listActors()).toEqual(["actor-1"]);
  });
});

describe("7. Resolve REVOCADO", () => {
  it("returns BindingView REVOCADO, not NOT_FOUND", async () => {
    const { engine } = engineFrom({
      actors: ["actor-1"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "REVOCADO",
        }),
      ],
    });
    const result = await engine.resolve({ actorRef: "actor-1", profileVersion: PROFILE });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.bindingStatus).toBe("REVOCADO");
    }
  });
});

describe("8. Actor is not deleted by revocation", () => {
  it("N05 retry on REVOCADO does not reactivate or remove Actor", async () => {
    const { store, engine } = engineFrom({
      actors: ["actor-1"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "sub-1",
          actorRef: "actor-1",
          status: "REVOCADO",
        }),
      ],
    });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result).toEqual({ ok: false, error: "REVOKED" });
    expect(await store.hasActor("actor-1")).toBe(true);
  });
});

describe("9. Wallet is not Actor", () => {
  it("N06 ActorRef is not treated as a wallet address", async () => {
    const wallet = "0xabc0000000000000000000000000000000000001";
    const { engine } = engineFrom({ actors: ["actor-1"] });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.actorRef).not.toBe(wallet);
      expect(looksLikeEvmAddress(result.value.actorRef)).toBe(false);
    }
    const provisioned = await provisionMocActor(createMemoryStore());
    expect(looksLikeEvmAddress(provisioned)).toBe(false);
    expect(provisioned.startsWith("moc:actor:")).toBe(true);
  });
});

describe("10. Privy subject is not Actor", () => {
  it("builds AuthSubject from Privy id, never from wallet, never as ActorRef", async () => {
    const wallet = "0x2222222222222222222222222222222222222222";
    const privyId = "did:privy:user-1";
    const authSubject = authSubjectFromPrivy({
      id: privyId,
      wallet: { address: wallet },
    });
    expect(authSubject).toEqual({ issuer: "privy", subject: privyId });
    expect(authSubject?.subject).not.toBe(wallet);

    const store = createMemoryStore();
    const result = await provisionThenBind(store, {
      authSubject: authSubject!,
      proof: PROOF,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.actorRef).not.toBe(privyId);
      expect(result.value.actorRef).not.toBe(wallet);
      expect(result.value.actorRef).not.toBe(authSubject!.subject);
    }
  });
});

describe("conformance negatives", () => {
  it("N01 unknown ActorRef → UNKNOWN_ACTOR", async () => {
    const { store, engine } = engineFrom({ actors: [] });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "missing",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result).toEqual({ ok: false, error: "UNKNOWN_ACTOR" });
    expect(await store.listActors()).toEqual([]);
  });

  it("N07 Bind must not create Actor", async () => {
    const { store, engine } = engineFrom({ actors: [] });
    await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "brand-new",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(await store.hasActor("brand-new")).toBe(false);
  });

  it("N02 insufficient proof → INVALID_PROOF", async () => {
    const { engine } = engineFrom({ actors: ["actor-1"] });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: { sufficient: false },
      profileVersion: PROFILE,
    });
    expect(result).toEqual({ ok: false, error: "INVALID_PROOF" });
  });

  it("N10 missing proof → INVALID_PROOF", async () => {
    const { engine } = engineFrom({ actors: ["actor-1"] });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: undefined,
      profileVersion: PROFILE,
    });
    expect(result).toEqual({ ok: false, error: "INVALID_PROOF" });
  });

  it("N08 unsupported version", async () => {
    const { engine } = engineFrom({ actors: ["actor-1"] });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-a", subject: "sub-1" },
      actorRef: "actor-1",
      proof: PROOF,
      profileVersion: "C-BIND/2",
    });
    expect(result).toEqual({ ok: false, error: "UNSUPPORTED_VERSION" });
  });

  it("N09 Resolve without Binding → NOT_FOUND (not a BindingStatus)", async () => {
    const { engine } = engineFrom({ actors: ["actor-1"] });
    const result = await engine.resolve({ actorRef: "actor-1", profileVersion: PROFILE });
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("G04 distinct issuers with the same subject string are different AuthSubjects", async () => {
    const { engine } = engineFrom({
      actors: ["actor-1", "actor-2"],
      bindings: [
        binding({
          issuer: "issuer-a",
          subject: "same-string",
          actorRef: "actor-1",
          status: "VIGENTE",
        }),
      ],
    });
    const result = await engine.bind({
      authSubject: { issuer: "issuer-b", subject: "same-string" },
      actorRef: "actor-2",
      proof: PROOF,
      profileVersion: PROFILE,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.actorRef).toBe("actor-2");
    }
  });
});
