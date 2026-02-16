import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { ArtistProfilePayload, ArtistProfileRecord, CreativeRole, RoyaltySplit } from "./types";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const out = JSON.parse(raw) as T;
    return out ?? fallback;
  } catch {
    return fallback;
  }
}

function jsonToArray<T>(value: Prisma.JsonValue | null | undefined, fallback: T[]): T[] {
  if (value == null) return fallback;
  if (typeof value === "string") return parseJson(value, fallback);
  if (Array.isArray(value)) return value as T[];
  return fallback;
}

function toRecord(row: {
  id: string;
  wallet: string;
  artisticName: string | null;
  country: string | null;
  creativeRoles: Prisma.JsonValue;
  defaultRoyaltySplits: Prisma.JsonValue;
  attestationHash: string | null;
  attestationChainId: number | null;
  createdAt: Date;
  updatedAt: Date;
}): ArtistProfileRecord {
  return {
    id: row.id,
    wallet: row.wallet,
    artisticName: row.artisticName,
    country: row.country,
    creativeRoles: jsonToArray(row.creativeRoles, []) as CreativeRole[],
    defaultRoyaltySplits: jsonToArray(row.defaultRoyaltySplits, []) as RoyaltySplit[],
    attestationHash: row.attestationHash,
    attestationChainId: row.attestationChainId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const normalizeWallet = (w: string) => w?.trim().toLowerCase() || "";

export async function getProfileByWallet(
  wallet: string
): Promise<ArtistProfileRecord | null> {
  const w = normalizeWallet(wallet);
  if (!w) return null;
  const row = await prisma.artistProfile.findUnique({
    where: { wallet: w },
  });
  if (!row) return null;
  return toRecord(row);
}

export async function upsertProfile(
  wallet: string,
  payload: ArtistProfilePayload
): Promise<ArtistProfileRecord> {
  const w = normalizeWallet(wallet);
  if (!w) throw new Error("Wallet is required");

  const creativeRoles = JSON.stringify(payload.creativeRoles ?? []);
  const defaultRoyaltySplits = JSON.stringify(
    (payload.defaultRoyaltySplits ?? []) as RoyaltySplit[]
  );

  const artisticName = payload.artisticName?.trim() ?? "";
  const country = payload.country ?? null;

  const row = await prisma.artistProfile.upsert({
    where: { wallet: w },
    create: {
      wallet: w,
      artisticName,
      country,
      creativeRoles,
      defaultRoyaltySplits,
    },
    update: {
      artisticName: payload.artisticName !== undefined ? (payload.artisticName ?? "").trim() : undefined,
      country: payload.country ?? undefined,
      creativeRoles,
      defaultRoyaltySplits,
    },
  });

  return toRecord(row);
}
