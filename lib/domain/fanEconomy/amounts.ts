import { createHash } from "node:crypto";
import { FanEconomyError } from "./errors";

export type MoneyView = {
  units: string;
  scale: number;
  asset: string;
};

export function remainingUnits(input: {
  authorizedUnits: bigint;
  consumedUnits: bigint;
  releasedUnits: bigint;
}): bigint {
  if (input.authorizedUnits < 0n || input.consumedUnits < 0n || input.releasedUnits < 0n) {
    throw new FanEconomyError("NEGATIVE_AMOUNT");
  }
  if (input.consumedUnits + input.releasedUnits > input.authorizedUnits) {
    throw new FanEconomyError("NEGATIVE_AMOUNT");
  }
  return input.authorizedUnits - input.consumedUnits - input.releasedUnits;
}

export function standingUnits(
  rows: { authorizedUnits: bigint; releasedUnits: bigint }[]
): bigint {
  return rows.reduce((sum, row) => {
    if (row.authorizedUnits < row.releasedUnits) throw new FanEconomyError("NEGATIVE_AMOUNT");
    return sum + (row.authorizedUnits - row.releasedUnits);
  }, 0n);
}

export function purchasingPower(
  rows: { remainingUnits: bigint; asset: string; scale: number }[]
): MoneyView[] {
  const groups = new Map<string, bigint>();
  for (const row of rows) {
    if (row.remainingUnits < 0n) throw new FanEconomyError("NEGATIVE_AMOUNT");
    if (row.remainingUnits === 0n) continue;
    const key = `${row.asset}\u0000${row.scale}`;
    groups.set(key, (groups.get(key) ?? 0n) + row.remainingUnits);
  }
  return [...groups.entries()]
    .map(([key, units]) => {
      const [asset, scale] = key.split("\u0000");
      return { units: units.toString(), scale: Number(scale), asset };
    })
    .sort((a, b) => a.asset.localeCompare(b.asset) || a.scale - b.scale);
}

export function canonicalHash(parts: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function redemptionRevenueId(redemptionId: string): string {
  return `revenue:redemption:${redemptionId}`;
}
