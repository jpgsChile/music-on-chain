import type { ActorRef } from "../types";
import { BPS_DENOMINATOR } from "./policy";
import type { DistributionShare } from "./types";

/**
 * Largest-remainder allocation. Deterministic: remainder ordered by leftover desc, then actorRef asc.
 * Floors sum to `total` exactly.
 */
export function allocateByBps(
  total: bigint,
  shares: DistributionShare[]
): { actorRef: ActorRef; units: bigint; bps: number; remainder: bigint }[] {
  if (shares.length === 0) {
    throw new Error("EMPTY_SHARES");
  }
  const bpsSum = shares.reduce((sum, share) => sum + share.bps, 0);
  if (bpsSum !== BPS_DENOMINATOR) {
    throw new Error("SHARES_MUST_SUM_TO_10000_BPS");
  }

  const rows = shares.map((share, index) => {
    const raw = total * BigInt(share.bps);
    const units = raw / BigInt(BPS_DENOMINATOR);
    const remainder = raw % BigInt(BPS_DENOMINATOR);
    return { ...share, index, units, remainder };
  });

  let leftover = total - rows.reduce((sum, row) => sum + row.units, BigInt(0));
  const ranked = [...rows].sort((a, b) => {
    if (a.remainder === b.remainder) {
      const byActor = a.actorRef.localeCompare(b.actorRef);
      if (byActor !== 0) return byActor;
      return a.index - b.index;
    }
    return a.remainder > b.remainder ? -1 : 1;
  });

  for (const row of ranked) {
    if (leftover <= BigInt(0)) break;
    row.units += BigInt(1);
    leftover -= BigInt(1);
  }

  return rows.map((row) => ({
    actorRef: row.actorRef,
    units: row.units,
    bps: row.bps,
    remainder: row.remainder,
  }));
}
