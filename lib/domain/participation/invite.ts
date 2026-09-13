import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashSessionToken } from "@/lib/auth/actorSession";
import { getPrisma } from "@/lib/db";

export type ParticipationBindingStatus = "pending" | "invited" | "bound";

export function participationBindingStatus(input: {
  actorRef: string | null;
  invited: boolean;
}): ParticipationBindingStatus {
  if (input.actorRef) return "bound";
  if (input.invited) return "invited";
  return "pending";
}

export async function issueParticipationInvite(
  input: { participationId: string; ownerActorRef: string },
  client: PrismaClient = getPrisma()
): Promise<{ token: string }> {
  const participation = await client.participation.findUnique({
    where: { id: input.participationId },
    include: { release: { select: { actorRef: true } }, invite: true },
  });
  if (!participation) throw new Error("PARTICIPATION_NOT_FOUND");
  if (participation.release.actorRef !== input.ownerActorRef) throw new Error("FORBIDDEN");
  if (participation.actorRef) throw new Error("ALREADY_BOUND");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  await client.participationInvite.upsert({
    where: { participationId: participation.id },
    create: {
      participationId: participation.id,
      tokenHash,
      createdByActorRef: input.ownerActorRef,
    },
    update: {
      tokenHash,
      createdByActorRef: input.ownerActorRef,
      acceptedAt: null,
    },
  });
  return { token };
}

export async function acceptParticipationInvite(
  input: { token: string; actorRef: string },
  client: PrismaClient = getPrisma()
): Promise<{ participationId: string; actorRef: string }> {
  const token = input.token.trim();
  if (!token) throw new Error("INVALID_INVITE");
  const tokenHash = hashSessionToken(token);
  const invite = await client.participationInvite.findUnique({
    where: { tokenHash },
    include: { participation: { include: { release: { select: { actorRef: true } } } } },
  });
  if (!invite || invite.acceptedAt) throw new Error("INVALID_INVITE");
  if (invite.participation.actorRef) throw new Error("ALREADY_BOUND");
  if (!input.actorRef.startsWith("moc:actor:")) throw new Error("INVALID_ACTOR");
  if (invite.participation.release.actorRef === input.actorRef) {
    throw new Error("OWNER_CANNOT_ACCEPT_COLLABORATOR_INVITE");
  }

  await client.$transaction(async (tx) => {
    await tx.participation.update({
      where: { id: invite.participationId },
      data: { actorRef: input.actorRef },
    });
    await tx.participationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });
  return { participationId: invite.participationId, actorRef: input.actorRef };
}
