import { FanEconomyError } from "./errors";

export function decimalToUnits(input: string, scale: number): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new FanEconomyError("INVALID_AMOUNT");
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > scale) throw new FanEconomyError("INVALID_AMOUNT");
  const padded = frac.padEnd(scale, "0");
  return BigInt(whole) * 10n ** BigInt(scale) + (padded ? BigInt(padded) : 0n);
}

export function unitsToDecimal(units: string, scale: number): string {
  const negative = units.startsWith("-");
  const raw = negative ? units.slice(1) : units;
  const padded = raw.padStart(scale + 1, "0");
  const whole = padded.slice(0, padded.length - scale);
  const frac = scale === 0 ? "" : padded.slice(padded.length - scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${frac ? `${whole}.${frac}` : whole}`;
}

export function formatMoney(units: string, scale: number, asset: string): string {
  return `${unitsToDecimal(units, scale)} ${asset}`;
}
