import { C_BIND_PROFILE } from "./contract";
import { parseAuthSubject, sameAuthSubject } from "./authSubject";
import type { CBindStore } from "./store";
import type {
  BindInput,
  BindingView,
  CBindProof,
  CBindResult,
  ResolveInput,
  RevokeInput,
} from "./types";

function parseProof(value: unknown): CBindResult<CBindProof> {
  if (value == null || typeof value !== "object") {
    return { ok: false, error: "INVALID_PROOF" };
  }
  const sufficient = (value as { sufficient?: unknown }).sufficient;
  if (sufficient !== true) {
    return { ok: false, error: "INVALID_PROOF" };
  }
  return { ok: true, value: { sufficient: true } };
}

function unsupported(profileVersion: string): CBindResult<never> | null {
  if (profileVersion !== C_BIND_PROFILE) {
    return { ok: false, error: "UNSUPPORTED_VERSION" };
  }
  return null;
}

function toView(binding: {
  actorRef: string;
  status: BindingView["bindingStatus"];
  asOf: string;
}): BindingView {
  return {
    actorRef: binding.actorRef,
    bindingStatus: binding.status,
    asOf: binding.asOf,
    profileVersion: C_BIND_PROFILE,
  };
}

export function createCBindEngine(store: CBindStore, now: () => string = () => new Date().toISOString()) {
  return {
    async bind(input: BindInput): Promise<CBindResult<BindingView>> {
      const versionErr = unsupported(input.profileVersion);
      if (versionErr) return versionErr;

      const subject = parseAuthSubject(input.authSubject);
      if (!subject.ok) return subject;

      const proof = parseProof(input.proof);
      if (!proof.ok) return proof;

      if (!input.actorRef?.trim()) {
        return { ok: false, error: "UNKNOWN_ACTOR" };
      }
      const actorRef = input.actorRef.trim();

      if (!(await store.hasActor(actorRef))) {
        return { ok: false, error: "UNKNOWN_ACTOR" };
      }

      const existing = await store.getByAuthSubject(subject.value.issuer, subject.value.subject);
      if (existing) {
        if (existing.status === "REVOCADO") {
          return { ok: false, error: "REVOKED" };
        }
        if (existing.actorRef !== actorRef) {
          return { ok: false, error: "CONFLICT" };
        }
        return { ok: true, value: toView(existing) };
      }

      const vigente = await store.getVigenteByActorRef(actorRef);
      if (vigente && !sameAuthSubject(subject.value, vigente)) {
        return { ok: false, error: "CONFLICT" };
      }

      const binding = {
        issuer: subject.value.issuer,
        subject: subject.value.subject,
        actorRef,
        status: "VIGENTE" as const,
        asOf: now(),
      };
      await store.putBinding(binding);
      return { ok: true, value: toView(binding) };
    },

    async resolve(input: ResolveInput): Promise<CBindResult<BindingView>> {
      const versionErr = unsupported(input.profileVersion);
      if (versionErr) return versionErr;

      const actorRef = input.actorRef?.trim();
      if (!actorRef) {
        return { ok: false, error: "NOT_FOUND" };
      }

      const binding = await store.getBindingForActorRef(actorRef);
      if (!binding) {
        return { ok: false, error: "NOT_FOUND" };
      }
      return { ok: true, value: toView(binding) };
    },

    async revoke(input: RevokeInput): Promise<CBindResult<BindingView>> {
      const versionErr = unsupported(input.profileVersion);
      if (versionErr) return versionErr;

      const subject = parseAuthSubject(input.authSubject);
      if (!subject.ok) return subject;

      const existing = await store.getByAuthSubject(subject.value.issuer, subject.value.subject);
      if (!existing) {
        return { ok: false, error: "NOT_FOUND" };
      }
      if (input.actorRef && input.actorRef.trim() !== existing.actorRef) {
        return { ok: false, error: "NOT_FOUND" };
      }

      if (existing.status === "REVOCADO") {
        return { ok: true, value: toView(existing) };
      }

      const revoked = {
        ...existing,
        status: "REVOCADO" as const,
        revokedAt: now(),
      };
      await store.putBinding(revoked);
      return { ok: true, value: toView(revoked) };
    },
  };
}

export type CBindEngine = ReturnType<typeof createCBindEngine>;
