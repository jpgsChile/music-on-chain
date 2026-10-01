import { getPrisma } from "@/lib/db";
import { canAttachWallet, normalizeWalletAddress } from "./coherence";

export async function attachWalletToActor(
  actorRef: string,
  address: string | null | undefined
): Promise<{ address: string | null; result: ReturnType<typeof canAttachWallet> | "invalid" }> {
  const normalized = normalizeWalletAddress(address);
  if (!normalized) {
    return { address: null, result: "invalid" };
  }

  const existing = await getPrisma().actorWallet.findUnique({
    where: { address: normalized },
  });
  const result = canAttachWallet(existing?.actorRef, actorRef);
  if (result === "conflict" && existing) {
    return reclaimWalletFromUnboundActor(actorRef, existing);
  }
  if (result === "ok") {
    const created = await getPrisma().actorWallet.createMany({
      data: [{ actorRef, address: normalized }],
      skipDuplicates: true,
    });
    if (created.count === 1) {
      return { address: normalized, result: "ok" };
    }
    const winner = await getPrisma().actorWallet.findUnique({
      where: { address: normalized },
    });
    if (!winner || winner.actorRef === actorRef) {
      return { address: normalized, result: "already" };
    }
    return reclaimWalletFromUnboundActor(actorRef, winner);
  }
  return { address: normalized, result };
}

/**
 * A concurrent first login can leave the wallet on an Actor that lost the bind.
 * That Actor is not an identity. Move the capability to the bound Actor.
 * A wallet already owned by another bound Actor stays where it is.
 */
async function reclaimWalletFromUnboundActor(
  actorRef: string,
  existing: { id: string; actorRef: string; address: string }
): Promise<{ address: string; result: "ok" | "conflict" }> {
  const ownerIsBound = await getPrisma().identityBinding.findFirst({
    where: { actorRef: existing.actorRef, status: "VIGENTE" },
    select: { id: true },
  });
  if (ownerIsBound) {
    return { address: existing.address, result: "conflict" };
  }
  const previous = existing.actorRef;
  await getPrisma().actorWallet.update({
    where: { id: existing.id },
    data: { actorRef },
  });
  await releaseUnboundActor(previous);
  return { address: existing.address, result: "ok" };
}

async function releaseUnboundActor(actorRef: string): Promise<void> {
  const prisma = getPrisma();
  const [bindings, wallets, profiles, releases, works] = await Promise.all([
    prisma.identityBinding.count({ where: { actorRef } }),
    prisma.actorWallet.count({ where: { actorRef } }),
    prisma.artistProfile.count({ where: { actorRef } }),
    prisma.musicRelease.count({ where: { actorRef } }),
    prisma.musicalWork.count({ where: { actorRef } }),
  ]);
  if (bindings || wallets || profiles || releases || works) return;
  await prisma.actorSession.updateMany({
    where: { actorRef, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.actor.delete({ where: { actorRef } }).catch((error: unknown) => {
    if (!isUniqueConstraint(error) && !isForeignKeyConstraint(error)) throw error;
  });
}

function isForeignKeyConstraint(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = (error as { code?: string }).code;
  return code === "P2003" || code === "23503";
}

function isUniqueConstraint(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = (error as { code?: string }).code;
  return code === "P2002" || code === "23505";
}

/** Remove a wallet capability. Never deletes the Actor. */
export async function revokeWalletFromActor(
  actorRef: string,
  address: string | null | undefined
): Promise<"ok" | "conflict" | "invalid"> {
  const normalized = normalizeWalletAddress(address);
  if (!normalized) return "invalid";
  const existing = await getPrisma().actorWallet.findUnique({
    where: { address: normalized },
  });
  if (!existing) return "ok";
  if (existing.actorRef !== actorRef) return "conflict";
  await getPrisma().actorWallet.delete({ where: { id: existing.id } });
  return "ok";
}

/** Replace a capability. ActorRef stays the same. */
export async function replaceActorWallet(
  actorRef: string,
  previous: string | null | undefined,
  next: string | null | undefined
): Promise<{ address: string | null; result: ReturnType<typeof canAttachWallet> | "invalid" }> {
  const attached = await attachWalletToActor(actorRef, next);
  if (attached.result === "conflict" || attached.result === "invalid") {
    return attached;
  }
  if (previous && normalizeWalletAddress(previous) !== attached.address) {
    await revokeWalletFromActor(actorRef, previous);
  }
  return attached;
}

export async function getWalletAddressForActor(actorRef: string): Promise<string | null> {
  const row = await getPrisma().actorWallet.findFirst({
    where: { actorRef },
    orderBy: { createdAt: "asc" },
  });
  return row?.address ?? null;
}

export async function getActorRefForWallet(address: string): Promise<string | null> {
  const normalized = normalizeWalletAddress(address);
  if (!normalized) return null;
  const row = await getPrisma().actorWallet.findUnique({ where: { address: normalized } });
  return row?.actorRef ?? null;
}
