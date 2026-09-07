/**
 * Precise money. Integer minor units + asset code.
 * Not a float. Not implicitly USD or USDC.
 */

export type AssetCode = string;

export type Money = {
  units: bigint;
  scale: number;
  asset: AssetCode;
};

export type MoneyJson = {
  units: string;
  scale: number;
  asset: AssetCode;
};

export function money(
  units: bigint | number | string,
  asset: AssetCode,
  scale = 6
): Money {
  if (!asset.trim()) throw new Error("ASSET_REQUIRED");
  if (!Number.isInteger(scale) || scale < 0 || scale > 18) {
    throw new Error("INVALID_SCALE");
  }
  const value = typeof units === "bigint" ? units : BigInt(units);
  if (value < BigInt(0)) throw new Error("NEGATIVE_AMOUNT");
  return { units: value, scale, asset: asset.trim() };
}

export function moneyZero(asset: AssetCode, scale = 6): Money {
  return money(BigInt(0), asset, scale);
}

export function assertSameAsset(a: Money, b: Money): void {
  if (a.asset !== b.asset || a.scale !== b.scale) {
    throw new Error("ASSET_MISMATCH");
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameAsset(a, b);
  return { units: a.units + b.units, scale: a.scale, asset: a.asset };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameAsset(a, b);
  if (a.units < b.units) throw new Error("INSUFFICIENT_AMOUNT");
  return { units: a.units - b.units, scale: a.scale, asset: a.asset };
}

export function moneyToJson(value: Money): MoneyJson {
  return {
    units: value.units.toString(),
    scale: value.scale,
    asset: value.asset,
  };
}

export function moneyFromJson(value: MoneyJson): Money {
  return money(value.units, value.asset, value.scale);
}

export function moneyEquals(a: Money, b: Money): boolean {
  return a.units === b.units && a.scale === b.scale && a.asset === b.asset;
}
