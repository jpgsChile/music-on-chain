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
