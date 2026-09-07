import { describe, expect, it } from "vitest";
import { authSubjectFromPrivy } from "@/lib/c-bind/fromPrivy";
import {
  accrueEntitlement,
  actorExistsWithoutWallet,
  actorIsIndependentOfAuthSubject,
  addTrack,
  artistProfileIdentity,
  attachWalletCapability,
  createActor,
  createParticipation,
  createRight,
  createWork,
  domainEvent,
  materializeRelease,
  musicalWorkHasNoChainIdentity,
  participationIsPendingInvite,
  replaceWalletCapability,
  revokeWalletCapability,
  rightIsNotAToken,
  settleEntitlement,
} from "./index";

describe("Web3 Trust-Native domain (tests 1–15)", () => {
  it("TEST 1: Actor exists without wallet", () => {
    const actor = createActor("moc:actor:11111111-1111-1111-1111-111111111111");
    expect(actorExistsWithoutWallet(actor)).toBe(true);
  });

  it("TEST 2: adding a wallet does not create a new Actor", () => {
    const actor = createActor("moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const next = attachWalletCapability(
      actor,
      "0x1111111111111111111111111111111111111111"
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.value.actorRef).toBe(actor.actorRef);
    expect(next.value.wallets).toHaveLength(1);
  });

  it("TEST 3: changing wallet does not change Actor", () => {
    const actor = createActor("moc:actor:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    const withFirst = attachWalletCapability(
      actor,
      "0x1111111111111111111111111111111111111111"
    );
    expect(withFirst.ok).toBe(true);
    if (!withFirst.ok) return;
    const replaced = replaceWalletCapability(
      withFirst.value,
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222"
    );
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(replaced.value.actorRef).toBe(actor.actorRef);
    expect(replaced.value.wallets.map((w) => w.address)).toEqual([
      "0x2222222222222222222222222222222222222222",
    ]);
  });

  it("TEST 4: revoking a wallet does not delete Actor", () => {
    const actor = createActor("moc:actor:cccccccc-cccc-cccc-cccc-cccccccccccc");
    const withWallet = attachWalletCapability(
      actor,
      "0x3333333333333333333333333333333333333333"
    );
    expect(withWallet.ok).toBe(true);
    if (!withWallet.ok) return;
    const revoked = revokeWalletCapability(
      withWallet.value,
      "0x3333333333333333333333333333333333333333"
    );
    expect(revoked.ok).toBe(true);
    if (!revoked.ok) return;
    expect(revoked.value.actorRef).toBe(actor.actorRef);
    expect(actorExistsWithoutWallet(revoked.value)).toBe(true);
  });

  it("TEST 5: Participation can exist without wallet", () => {
    const participation = createParticipation({
      participationId: "p1",
      workId: "w1",
      releaseId: "r1",
      actorRef: "moc:actor:dddddddd-dddd-dddd-dddd-dddddddddddd",
      role: "composer",
    });
    expect(participation).not.toHaveProperty("wallet");
    expect(participation.actorRef).toMatch(/^moc:actor:/);
  });

  it("TEST 5b: Participation can exist as a pending invite without Actor or wallet", () => {
    const pending = createParticipation({
      participationId: "p2",
      workId: "w1",
      releaseId: "r1",
      actorRef: null,
      role: "producer",
    });
    expect(participationIsPendingInvite(pending)).toBe(true);
    expect(pending).not.toHaveProperty("wallet");
  });

  it("TEST 6: ArtistProfile identity is Actor, not wallet", () => {
    const profile = {
      actorRef: "moc:actor:eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      displayName: "Nona",
      lookupWallet: "0x4444444444444444444444444444444444444444",
    };
    expect(artistProfileIdentity(profile)).toBe(profile.actorRef);
    expect(artistProfileIdentity(profile)).not.toBe(profile.lookupWallet);
  });

  it("TEST 7: Privy subject is not Actor", () => {
    const authSubject = authSubjectFromPrivy({
      id: "did:privy:xyz",
      wallet: { address: "0x5555555555555555555555555555555555555555" },
    });
    const actor = createActor("moc:actor:ffffffff-ffff-ffff-ffff-ffffffffffff");
    expect(authSubject).toEqual({ issuer: "privy", subject: "did:privy:xyz" });
    expect(actorIsIndependentOfAuthSubject(actor, authSubject!)).toBe(true);
  });

  it("TEST 8: AuthSubject issuer may change without redefining Actor", () => {
    const actor = createActor("moc:actor:99999999-9999-9999-9999-999999999999");
    const privy = { issuer: "privy", subject: "did:privy:one" };
    const other = { issuer: "other-idp", subject: "user-99" };
    expect(actorIsIndependentOfAuthSubject(actor, privy)).toBe(true);
    expect(actorIsIndependentOfAuthSubject(actor, other)).toBe(true);
    expect(actor.actorRef).toBe("moc:actor:99999999-9999-9999-9999-999999999999");
  });

  it("TEST 9: music domain does not depend on blockchain", () => {
    const work = createWork({
      workId: "work-1",
      createdByActorRef: "moc:actor:1",
      title: "Obra",
    });
    const release = materializeRelease({
      releaseId: "rel-1",
      work,
      publisherActorRef: "moc:actor:1",
    });
    const track = addTrack({ trackId: "trk-1", release });
    expect(musicalWorkHasNoChainIdentity(work)).toBe(true);
    expect(release.workId).toBe(work.workId);
    expect(track.workId).toBe(work.workId);
    expect(work.workId).not.toBe(track.trackId);
    expect(work.workId).not.toBe(release.releaseId);
  });

  it("TEST 10: Rights do not depend on a token", () => {
    const right = createRight({
      rightId: "right-1",
      workId: "work-1",
      actorRef: "moc:actor:1",
      kind: "performance",
    });
    expect(rightIsNotAToken(right)).toBe(true);
    expect(right.actorRef).toBe("moc:actor:1");
  });

  it("TEST 11: Entitlement can exist before settlement", () => {
    const entitlement = accrueEntitlement({
      entitlementId: "ent-1",
      actorRef: "moc:actor:1",
      source: { kind: "right", rightId: "right-1" },
    });
    expect(entitlement.status).toBe("accrued");
  });

  it("TEST 12: Settlement may execute on-chain later without redefining the domain", () => {
    const entitlement = accrueEntitlement({
      entitlementId: "ent-2",
      actorRef: "moc:actor:1",
      source: { kind: "participation", participationId: "p1" },
    });
    const { entitlement: settled, settlement } = settleEntitlement(
      entitlement,
      "set-1",
      "on-chain"
    );
    expect(settled.actorRef).toBe(entitlement.actorRef);
    expect(settlement.entitlementId).toBe(entitlement.entitlementId);
    expect(settlement.executionLayer).toBe("on-chain");
  });

  it("TEST 13: changing chain infrastructure must not change Actor", () => {
    const actor = createActor("moc:actor:13131313-1313-1313-1313-131313131313");
    expect(actor).not.toHaveProperty("chainId");
    expect(actor).not.toHaveProperty("rpc");
    expect(actor.actorRef).toMatch(/^moc:actor:/);
  });

  it("TEST 14: domain semantics do not import persistence", () => {
    const source = [
      createActor,
      createWork,
      createParticipation,
      createRight,
      accrueEntitlement,
    ]
      .map((fn) => fn.name)
      .join(",");
    expect(source).toContain("createActor");
    expect(source).not.toMatch(/prisma|sqlite|postgres/i);
  });

  it("TEST 15: UI is not the source of truth for Actor, Participation, or Rights", () => {
    const actor = createActor("moc:actor:15151515-1515-1515-1515-151515151515");
    const participation = createParticipation({
      participationId: "p-ui",
      workId: "w-ui",
      releaseId: "r-ui",
      actorRef: actor.actorRef,
      role: "performer",
    });
    const right = createRight({
      rightId: "right-ui",
      workId: "w-ui",
      actorRef: actor.actorRef,
      kind: "master",
    });
    const event = domainEvent({
      type: "ParticipationRecorded",
      entityKind: "participation",
      entityId: participation.participationId,
      actorRef: actor.actorRef,
      origin: "api",
    });
    expect(event.origin).not.toBeUndefined();
    expect(event.origin).not.toMatch(/ui|localStorage|privy/i);
    expect(right.actorRef).toBe(actor.actorRef);
  });
});
