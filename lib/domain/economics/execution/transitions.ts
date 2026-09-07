import type { ExecutionLifecycle, ExecutionOutcome } from "./types";

const ALLOWED: Record<ExecutionLifecycle, ExecutionLifecycle[]> = {
  pending: ["accepted", "submitted", "confirmed", "failed", "unknown"],
  accepted: ["submitted", "confirmed", "failed"],
  submitted: ["confirmed", "failed", "unknown"],
  unknown: ["confirmed", "failed", "unknown"],
  failed: ["submitted", "confirmed", "accepted"],
  confirmed: [],
};

export function outcomeToLifecycle(status: ExecutionOutcome): ExecutionLifecycle {
  switch (status) {
    case "ACCEPTED":
      return "accepted";
    case "SUBMITTED":
      return "submitted";
    case "CONFIRMED":
      return "confirmed";
    case "FAILED":
      return "failed";
    case "UNKNOWN":
      return "unknown";
  }
}

export function canTransition(
  from: ExecutionLifecycle,
  to: ExecutionLifecycle
): boolean {
  if (from === to && (from === "unknown" || from === "submitted" || from === "confirmed")) {
    return true;
  }
  return ALLOWED[from].includes(to);
}

export function assertTransition(
  from: ExecutionLifecycle,
  to: ExecutionLifecycle
): void {
  if (!canTransition(from, to)) {
    throw new Error("INVALID_EXECUTION_TRANSITION");
  }
}
