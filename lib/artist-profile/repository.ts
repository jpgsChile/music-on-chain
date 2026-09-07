import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type {
  ArtistChannelSocials,
  ArtistProfilePayload,
  ArtistProfileRecord,
  CreativeRole,
  RoyaltySplit,
} from "./types";

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

function jsonToSocials(value: Prisma.JsonValue | null | undefined): ArtistChannelSocials {
  if (value == null) return {};
  if (typeof value === "string") return parseJson(value, {});
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as ArtistChannelSocials;
  }
  return {};
}

function toRecord(row: {
  id: string;
  actorRef: string | null;
  wallet: string | null;
  artisticName: string | null;
  country: string | null;
  username: string | null;
  biography: string | null;
  bannerUrl: string | null;
  avatarUrl: string | null;
  socials: Prisma.JsonValue;
  verified: boolean;
  creativeRoles: Prisma.JsonValue;
  defaultRoyaltySplits: Prisma.JsonValue;
  attestationHash: string | null;
  attestationChainId: number | null;
  createdAt: Date;
  updatedAt: Date;
}): ArtistProfileRecord {
  return {
    id: row.id,
    actorRef: row.actorRef,
    wallet: row.wallet,
    artisticName: row.artisticName,
    country: row.country,
    username: row.username,
    biography: row.biography,
    bannerUrl: row.bannerUrl,
    avatarUrl: row.avatarUrl,
    socials: jsonToSocials(row.socials),
    verified: Boolean(row.verified),
    creativeRoles: jsonToArray(row.creativeRoles, []) as CreativeRole[],
    defaultRoyaltySplits: jsonToArray(row.defaultRoyaltySplits, []) as RoyaltySplit[],
    attestationHash: row.attestationHash,
    attestationChainId: row.attestationChainId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const normalizeWallet = (w: string) => w?.trim().toLowerCase() || "";

function normalizeUsername(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const cleaned = raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
  return cleaned || null;
}

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

export async function getProfileByActorRef(
  actorRef: string
): Promise<ArtistProfileRecord | null> {
  const ref = actorRef?.trim();
  if (!ref) return null;
  const row = await prisma.artistProfile.findUnique({
    where: { actorRef: ref },
  });
  if (!row) return null;
  return toRecord(row);
}

export async function claimOrphanProfile(
  actorRef: string,
  wallet: string | null
): Promise<ArtistProfileRecord | null> {
  const w = wallet ? normalizeWallet(wallet) : "";
  if (!w) return getProfileByActorRef(actorRef);

  const byActor = await prisma.artistProfile.findUnique({ where: { actorRef } });
  if (byActor) return toRecord(byActor);

  const byWallet = await prisma.artistProfile.findUnique({ where: { wallet: w } });
  if (!byWallet) return null;
  if (byWallet.actorRef && byWallet.actorRef !== actorRef) return toRecord(byWallet);

  const row = await prisma.artistProfile.update({
    where: { id: byWallet.id },
    data: { actorRef },
  });
  return toRecord(row);
}

export async function upsertProfile(
  wallet: string | null | undefined,
  payload: ArtistProfilePayload,
  actorRef?: string | null
): Promise<ArtistProfileRecord> {
  const w = wallet ? normalizeWallet(wallet) : "";
  const ref = actorRef?.trim() || null;
  if (!w && !ref) throw new Error("Actor or wallet is required");

  const existing =
    (ref ? await prisma.artistProfile.findUnique({ where: { actorRef: ref } }) : null) ??
    (w ? await prisma.artistProfile.findUnique({ where: { wallet: w } }) : null);

  if (existing?.actorRef && ref && existing.actorRef !== ref) {
    throw new Error("PROFILE_OWNED");
  }

  const creativeRoles =
    payload.creativeRoles !== undefined
      ? JSON.stringify(payload.creativeRoles)
      : existing?.creativeRoles != null
        ? (typeof existing.creativeRoles === "string"
            ? existing.creativeRoles
            : JSON.stringify(existing.creativeRoles))
        : JSON.stringify([]);

  const defaultRoyaltySplits =
    payload.defaultRoyaltySplits !== undefined
      ? JSON.stringify(payload.defaultRoyaltySplits as RoyaltySplit[])
      : existing?.defaultRoyaltySplits != null
        ? (typeof existing.defaultRoyaltySplits === "string"
            ? existing.defaultRoyaltySplits
            : JSON.stringify(existing.defaultRoyaltySplits))
        : JSON.stringify([]);

  const socials =
    payload.socials !== undefined
      ? JSON.stringify(payload.socials ?? {})
      : existing?.socials != null
        ? (typeof existing.socials === "string"
            ? existing.socials
            : JSON.stringify(existing.socials))
        : JSON.stringify({});

  const artisticName =
    payload.artisticName !== undefined
      ? (payload.artisticName?.trim() ?? "")
      : (existing?.artisticName ?? "");

  const username =
    payload.username !== undefined
      ? normalizeUsername(payload.username)
      : (existing?.username ?? null);

  const data = {
    artisticName,
    country:
      payload.country !== undefined ? payload.country : (existing?.country ?? null),
    username,
    biography:
      payload.biography !== undefined
        ? payload.biography?.trim() || null
        : (existing?.biography ?? null),
    bannerUrl:
      payload.bannerUrl !== undefined
        ? payload.bannerUrl || null
        : (existing?.bannerUrl ?? null),
    avatarUrl:
      payload.avatarUrl !== undefined
        ? payload.avatarUrl || null
        : (existing?.avatarUrl ?? null),
    socials,
    creativeRoles,
    defaultRoyaltySplits,
    actorRef: ref ?? existing?.actorRef ?? null,
    wallet: w || existing?.wallet || null,
  };

  const row = existing
    ? await prisma.artistProfile.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.artistProfile.create({ data });

  return toRecord(row);
}
