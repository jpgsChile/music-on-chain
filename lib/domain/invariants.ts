/**
 * Pure domain operations. No Prisma, no Privy, no blockchain.
 * These semantics must survive SQLite → Postgres and off-chain → on-chain settlement.
 */

import { looksLikeEvmAddress } from "@/lib/c-bind/fromPrivy";
import type {
  Actor,
  ActorRef,
  ArtistProfile,
  AuthSubject,
  DomainResult,
  Entitlement,
  MusicRelease,
  MusicTrack,
  MusicalWork,
  Participation,
  RightRelationship,
  Settlement,
  WalletCapability,
} from "./types";

export function createActor(actorRef: ActorRef): Actor {
  if (!actorRef.trim()) {
    throw new Error("ActorRef required");
  }
  if (looksLikeEvmAddress(actorRef)) {
    throw new Error("ActorRef must not be a wallet address");
  }
  return { actorRef, wallets: [] };
}

export function attachWalletCapability(
  actor: Actor,
  address: string
): DomainResult<Actor> {
  const normalized = address.trim().toLowerCase();
  if (!looksLikeEvmAddress(normalized)) {
    return { ok: false, error: "invalid" };
  }
  if (actor.wallets.some((w) => w.address === normalized)) {
    return { ok: true, value: actor };
  }
  const capability: WalletCapability = { address: normalized };
  return { ok: true, value: { ...actor, wallets: [...actor.wallets, capability] } };
}

export function replaceWalletCapability(
  actor: Actor,
  previous: string | null,
  next: string
): DomainResult<Actor> {
  const attached = attachWalletCapability(actor, next);
  if (!attached.ok) return attached;
  if (!previous) return attached;
  return revokeWalletCapability(attached.value, previous);
}

export function revokeWalletCapability(
  actor: Actor,
  address: string
): DomainResult<Actor> {
  const normalized = address.trim().toLowerCase();
  return {
    ok: true,
    value: {
      actorRef: actor.actorRef,
      wallets: actor.wallets.filter((w) => w.address !== normalized),
    },
  };
}

export function actorExistsWithoutWallet(actor: Actor): boolean {
  return Boolean(actor.actorRef) && actor.wallets.length === 0;
}

export function artistProfileIdentity(profile: ArtistProfile): ActorRef {
  return profile.actorRef;
}

export function createWork(input: {
  workId: string;
  createdByActorRef: ActorRef;
  title: string;
}): MusicalWork {
  return {
    workId: input.workId,
    createdByActorRef: input.createdByActorRef,
    title: input.title,
  };
}

export function materializeRelease(input: {
  releaseId: string;
  work: MusicalWork;
  publisherActorRef: ActorRef;
}): MusicRelease {
  return {
    releaseId: input.releaseId,
    workId: input.work.workId,
    publisherActorRef: input.publisherActorRef,
  };
}

export function addTrack(input: {
  trackId: string;
  release: MusicRelease;
}): MusicTrack {
  return {
    trackId: input.trackId,
    releaseId: input.release.releaseId,
    workId: input.release.workId,
  };
}

export function createParticipation(input: {
  participationId: string;
  workId: string;
  releaseId: string;
  actorRef: ActorRef | null;
  role: string;
}): Participation {
  return {
    participationId: input.participationId,
    workId: input.workId,
    releaseId: input.releaseId,
    actorRef: input.actorRef,
    role: input.role,
  };
}

export function participationIsPendingInvite(p: Participation): boolean {
  return p.actorRef == null;
}

export function createRight(input: {
  rightId: string;
  workId: string;
  actorRef: ActorRef;
  kind: RightRelationship["kind"];
}): RightRelationship {
  return {
    rightId: input.rightId,
    workId: input.workId,
    actorRef: input.actorRef,
    kind: input.kind,
  };
}

export function accrueEntitlement(input: {
  entitlementId: string;
  actorRef: ActorRef;
  source: Entitlement["source"];
}): Entitlement {
  return {
    entitlementId: input.entitlementId,
    actorRef: input.actorRef,
    source: input.source,
    status: "accrued",
  };
}

export function settleEntitlement(
  entitlement: Entitlement,
  settlementId: string,
  executionLayer: Settlement["executionLayer"]
): { entitlement: Entitlement; settlement: Settlement } {
  return {
    entitlement: { ...entitlement, status: "settled" },
    settlement: {
      settlementId,
      entitlementId: entitlement.entitlementId,
      executionLayer,
    },
  };
}

/** Actor identity is independent of AuthSubject issuer/subject. */
export function actorIsIndependentOfAuthSubject(
  actor: Actor,
  authSubject: AuthSubject
): boolean {
  return (
    actor.actorRef !== authSubject.subject &&
    actor.actorRef !== authSubject.issuer &&
    !("issuer" in actor) &&
    !("subject" in actor)
  );
}

export function musicalWorkHasNoChainIdentity(work: MusicalWork): boolean {
  return !("chainId" in work) && !("contract" in work) && !("txHash" in work);
}

export function rightIsNotAToken(right: RightRelationship): boolean {
  return !("tokenId" in right) && !("nft" in right) && !("contract" in right);
}
