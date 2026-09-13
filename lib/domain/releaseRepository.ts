import { getPrisma } from "@/lib/db";
import type { ReleaseCollaborator, ReleaseType, PricingModel } from "@/types/upload";

export type PersistReleaseInput = {
  actorRef: string;
  primaryDisplayName?: string;
  title: string;
  releaseType: ReleaseType;
  language: string;
  primaryGenre: string;
  secondaryGenre: string;
  description: string;
  coverUrl: string | null;
  soloCreator: boolean;
  collaborators: ReleaseCollaborator[];
  pricingModels: PricingModel[];
  priceUsdc: number;
  tokenId: string | null;
  tracks: {
    title: string;
    version: string;
    durationSec: number | null;
    explicit: boolean;
    lyrics: string;
    previewUrl: string | null;
  }[];
};

export async function persistMusicRelease(input: PersistReleaseInput) {
  const participations: {
    displayName: string;
    email: string | null;
    actorRef: string | null;
    role: string;
    revenueSharePercent: number;
  }[] = input.soloCreator
    ? [
        {
          displayName: input.primaryDisplayName?.trim() || "Artist",
          email: null,
          actorRef: input.actorRef,
          role: "composer",
          revenueSharePercent: 100,
        },
      ]
    : input.collaborators.map((c) => ({
        displayName: c.name.trim(),
        email: c.email.trim() || null,
        actorRef: c.actorRef?.trim() || null,
        role: c.role,
        revenueSharePercent: Number(c.percentage) || 0,
      }));

  return getPrisma().$transaction(async (tx) => {
    const work = await tx.musicalWork.create({
      data: {
        actorRef: input.actorRef,
        title: input.title,
      },
    });

    return tx.musicRelease.create({
      data: {
        workId: work.id,
        actorRef: input.actorRef,
        title: input.title,
        releaseType: input.releaseType,
        language: input.language,
        primaryGenre: input.primaryGenre,
        secondaryGenre: input.secondaryGenre,
        description: input.description,
        coverUrl: input.coverUrl,
        status: "PUBLISHED",
        soloCreator: input.soloCreator,
        pricingModels: JSON.stringify(input.pricingModels),
        priceUsdc: input.priceUsdc,
        tokenId: input.tokenId,
        publishedAt: new Date(),
        tracks: {
          create: input.tracks.map((track, position) => ({
            title: track.title,
            version: track.version,
            durationSec: track.durationSec,
            explicit: track.explicit,
            lyrics: track.lyrics,
            previewUrl: track.previewUrl,
            position,
          })),
        },
        participations: {
          create: participations,
        },
      },
      include: { tracks: true, participations: true, work: true },
    });
  });
}

export async function listReleasesByActor(actorRef: string) {
  return getPrisma().musicRelease.findMany({
    where: { actorRef },
    orderBy: { createdAt: "desc" },
    include: { tracks: { orderBy: { position: "asc" } }, participations: true, work: true },
  });
}

export type MusicalContextError =
  | "MUSICAL_CONTEXT_REQUIRED"
  | "MUSICAL_CONTEXT_NOT_FOUND"
  | "WORK_RELEASE_MISMATCH";

/** Resolve Work (required origin) and optional Release owned by this Actor. Does not invent a Work. */
export async function resolveOwnedMusicalContext(
  actorRef: string,
  input: { workId?: string | null; releaseId?: string | null }
): Promise<{ workId: string; releaseId?: string } | { error: MusicalContextError }> {
  const workId = typeof input.workId === "string" ? input.workId.trim() : "";
  const releaseId = typeof input.releaseId === "string" ? input.releaseId.trim() : "";
  if (!workId && !releaseId) return { error: "MUSICAL_CONTEXT_REQUIRED" };

  const prisma = getPrisma();
  if (releaseId) {
    const release = await prisma.musicRelease.findFirst({
      where: { id: releaseId, actorRef },
      select: { id: true, workId: true },
    });
    if (!release) return { error: "MUSICAL_CONTEXT_NOT_FOUND" };
    if (workId && workId !== release.workId) return { error: "WORK_RELEASE_MISMATCH" };
    return { workId: release.workId, releaseId: release.id };
  }

  const work = await prisma.musicalWork.findFirst({
    where: { id: workId, actorRef },
    select: { id: true },
  });
  if (!work) return { error: "MUSICAL_CONTEXT_NOT_FOUND" };
  return { workId: work.id };
}

export async function listParticipationsByActor(actorRef: string) {
  return getPrisma().participation.findMany({
    where: {
      OR: [{ actorRef }, { release: { actorRef } }],
    },
    include: {
      release: { select: { id: true, title: true, actorRef: true } },
      invite: { select: { acceptedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
