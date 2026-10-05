export type SupportIntent = {
  id: string;
  releaseId: string;
  units: string;
};

/** Same release and amount keep one redemption id. A changed amount or release is a new intent. */
export function beginSupportIntent(
  current: SupportIntent | null,
  next: { releaseId: string; units: string },
  mintId: () => string
): SupportIntent {
  if (current && current.releaseId === next.releaseId && current.units === next.units) {
    return current;
  }
  return { id: mintId(), releaseId: next.releaseId, units: next.units };
}

export type SupportLoadPhase = "loading" | "ready" | "error";

/** A stale response must not replace a loaded desk with a failure. */
export function resolveSupportLoadPhase(
  current: SupportLoadPhase,
  requestGeneration: number,
  latestGeneration: number,
  outcome: "ready" | "failed"
): SupportLoadPhase {
  if (requestGeneration !== latestGeneration) return current;
  if (outcome === "ready") return "ready";
  return current === "ready" ? current : "error";
}

/** The load failure is only for an empty desk. An action failure stays visible. */
export function supportLoadFailureVisible(
  phase: SupportLoadPhase,
  hasDesk: boolean,
  actionFailed: boolean
): boolean {
  return actionFailed || (phase === "error" && !hasDesk);
}

export function supportSubmitAllowed(input: {
  pending: boolean;
  releaseId: string;
  remainingUnits: bigint;
  amountUnits: bigint;
}): boolean {
  if (input.pending) return false;
  if (!input.releaseId.trim()) return false;
  if (input.amountUnits <= 0n) return false;
  if (input.amountUnits > input.remainingUnits) return false;
  return true;
}
