import { C_BIND_PROFILE } from "./contract";

export type CBindProfileVersion = typeof C_BIND_PROFILE;

export type AuthSubject = {
  issuer: string;
  subject: string;
};

export type BindingStatus = "VIGENTE" | "REVOCADO";

export type BindingView = {
  actorRef: string;
  bindingStatus: BindingStatus;
  asOf: string;
  profileVersion: CBindProfileVersion;
};

/** Sufficiency stand-in. C-BIND/1 does not impose JWT, OAuth, DID, or VC. */
export type CBindProof = {
  sufficient: boolean;
};

export type CBindErrorCode =
  | "INVALID_SUBJECT"
  | "INVALID_ISSUER"
  | "INVALID_PROOF"
  | "UNKNOWN_ACTOR"
  | "CONFLICT"
  | "REVOKED"
  | "NOT_FOUND"
  | "UNSUPPORTED_VERSION";

export type CBindOk<T> = { ok: true; value: T };
export type CBindErr = { ok: false; error: CBindErrorCode };
export type CBindResult<T> = CBindOk<T> | CBindErr;

export type StoredBinding = {
  issuer: string;
  subject: string;
  actorRef: string;
  status: BindingStatus;
  asOf: string;
  revokedAt?: string;
};

export type BindInput = {
  authSubject: unknown;
  actorRef: string;
  proof: unknown;
  profileVersion: string;
  /** External metadata only. Not part of BindingContext (C-BIND/1 D23). */
  purpose?: unknown;
};

export type ResolveInput = {
  actorRef: string;
  profileVersion: string;
};

export type RevokeInput = {
  authSubject: unknown;
  actorRef?: string;
  profileVersion: string;
};
