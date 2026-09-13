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
  if (result === "conflict") {
    return { address: existing?.address ?? normalized, result };
  }
  if (result === "ok") {
    await getPrisma().actorWallet.create({
      data: { actorRef, address: normalized },
    });
  }
  return { address: normalized, result };
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
