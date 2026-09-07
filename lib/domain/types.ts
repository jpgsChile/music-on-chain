/**
 * MOC domain semantics. Persistence (Prisma/SQLite) maps these types; it does not define them.
 * C-BIND/1 supplies AuthSubject → ActorRef. MOC owns the rest.
 *
 * WEB3-NATIVE SEMANTICS (this module) is prior to ON-CHAIN EXECUTION (not implemented here).
 */

export type ActorRef = string;

/** Trust-Native AuthSubject consumed via C-BIND/1. Not an Actor. */
export type AuthSubject = {
  issuer: string;
  subject: string;
};

/**
 * MOC Actor. Opaque ActorRef. Not Privy user, not wallet, not a database row identity.
 * May exist with zero wallet capabilities.
 */
export type Actor = {
  actorRef: ActorRef;
  wallets: WalletCapability[];
};

/** Wallet is a capability of an Actor. Never Actor identity. */
export type WalletCapability = {
  address: string;
};

/**
 * Presentation / product channel of an Actor in an artist role.
 * Identity is actorRef. Wallet, if present, is public lookup only.
 */
export type ArtistProfile = {
  actorRef: ActorRef;
  displayName: string;
  lookupWallet?: string | null;
};

/** Musical work. Distinct from a Release (publication) and a Track (recording artifact). */
export type MusicalWork = {
  workId: string;
  createdByActorRef: ActorRef;
  title: string;
};

/** Commercial publication that materializes a Work. */
export type MusicRelease = {
  releaseId: string;
  workId: string;
  publisherActorRef: ActorRef;
};

/** Recording that belongs to a Release and therefore to a Work. */
export type MusicTrack = {
  trackId: string;
  releaseId: string;
  workId: string;
};

/**
 * Participation in a Work/Release. Identity is Actor (or a pending invite).
 * Not a wallet. Not ownership. Not a payment.
 */
export type Participation = {
  participationId: string;
  workId: string;
  releaseId: string;
  actorRef: ActorRef | null;
  role: string;
};

/** Domain right. Not a token, NFT, or transaction. */
export type RightKind = "performance" | "mechanical" | "sync" | "master" | "other";

export type RightRelationship = {
  rightId: string;
  workId: string;
  actorRef: ActorRef;
  kind: RightKind;
};

/**
 * Accrued claim. May exist before any settlement (on-chain or otherwise).
 */
export type Entitlement = {
  entitlementId: string;
  actorRef: ActorRef;
  source:
    | { kind: "right"; rightId: string }
    | { kind: "participation"; participationId: string };
  status: "accrued" | "pending-settlement" | "settled";
};

/**
 * Future execution of an entitlement. Settlement does not redefine Actor, Participation, or Rights.
 */
export type Settlement = {
  settlementId: string;
  entitlementId: string;
  executionLayer: "unspecified" | "off-chain" | "on-chain";
};

export type DomainEvent = {
  type: string;
  entityKind:
    | "actor"
    | "work"
    | "release"
    | "track"
    | "participation"
    | "right"
    | "entitlement";
  entityId: string;
  actorRef?: ActorRef;
  occurredAt: string;
  origin: "bind" | "api" | "publish" | "system";
};

export type DomainResult<T> = { ok: true; value: T } | { ok: false; error: string };
