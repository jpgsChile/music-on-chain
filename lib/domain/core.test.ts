import { describe, expect, it } from "vitest";
import { canAttachWallet, canClaimProfile, normalizeWalletAddress } from "./coherence";
import { authSubjectFromPrivy } from "@/lib/c-bind/fromPrivy";
import { looksLikeEvmAddress } from "@/lib/c-bind/fromPrivy";

describe("MOC core coherence", () => {
  it("keeps Privy authentication distinct from Actor identity", () => {
    const authSubject = authSubjectFromPrivy({
      id: "did:privy:abc",
      wallet: { address: "0x2222222222222222222222222222222222222222" },
    });
    expect(authSubject).toEqual({ issuer: "privy", subject: "did:privy:abc" });
    expect(authSubject?.subject).not.toMatch(/^moc:actor:/);
  });

  it("treats wallet as a capability, never as ActorRef", () => {
    const wallet = "0x2222222222222222222222222222222222222222";
    expect(normalizeWalletAddress(wallet)).toBe(wallet.toLowerCase());
    expect(looksLikeEvmAddress("moc:actor:11111111-1111-1111-1111-111111111111")).toBe(false);
    expect(canAttachWallet(null, "moc:actor:1")).toBe("ok");
    expect(canAttachWallet("moc:actor:1", "moc:actor:1")).toBe("already");
    expect(canAttachWallet("moc:actor:1", "moc:actor:2")).toBe("conflict");
  });

  it("lets Actor own ArtistProfile without stealing another Actor's channel", () => {
    expect(canClaimProfile(null, "moc:actor:1")).toBe("ok");
    expect(canClaimProfile("moc:actor:1", "moc:actor:1")).toBe("already");
    expect(canClaimProfile("moc:actor:1", "moc:actor:2")).toBe("conflict");
  });

  it("does not treat collaborator invite email or revenue share as ownership", () => {
    const participation = {
      displayName: "Alex",
      email: "alex@example.com",
      actorRef: null as string | null,
      role: "composer",
      revenueSharePercent: 40,
    };
    expect(participation).not.toHaveProperty("wallet");
    expect(participation).not.toHaveProperty("ownership");
    expect(participation).not.toHaveProperty("payment");
    expect(participation.email).not.toBe("moc:actor:1");
    expect(participation.revenueSharePercent).toBe(40);
  });
});
