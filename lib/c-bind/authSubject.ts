import type { AuthSubject, CBindErr, CBindResult } from "./types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * AuthSubject = issuer + subject only.
 * Wallet address is not AuthSubject. Privy user id is not Actor.
 */
export function parseAuthSubject(value: unknown): CBindResult<AuthSubject> {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "INVALID_SUBJECT" };
  }
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.issuer)) {
    return { ok: false, error: "INVALID_ISSUER" };
  }
  if (!isNonEmptyString(record.subject)) {
    return { ok: false, error: "INVALID_SUBJECT" };
  }
  return {
    ok: true,
    value: {
      issuer: record.issuer.trim(),
      subject: record.subject.trim(),
    },
  };
}

export function authSubjectKey(subject: AuthSubject): string {
  return `${subject.issuer}\u0000${subject.subject}`;
}

export function sameAuthSubject(a: AuthSubject, b: AuthSubject): boolean {
  return a.issuer === b.issuer && a.subject === b.subject;
}

export function isCBindErr(value: CBindResult<unknown>): value is CBindErr {
  return value.ok === false;
}
