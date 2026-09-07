import { prisma } from "@/lib/db";
import { canAttachWallet, normalizeWalletAddress } from "./coherence";

export async function attachWalletToActor(
  actorRef: string,
  address: string | null | undefined
): Promise<{ address: string | null; result: ReturnType<typeof canAttachWallet> | "invalid" }> {
  const normalized = normalizeWalletAddress(address);
  if (!normalized) {
    return { address: null, result: "invalid" };
  }

  const existing = await prisma.actorWallet.findUnique({
    where: { address: normalized },
  });
  const result = canAttachWallet(existing?.actorRef, actorRef);
  if (result === "conflict") {
    return { address: existing?.address ?? normalized, result };
  }
  if (result === "ok") {
    await prisma.actorWallet.create({
      data: { actorRef, address: normalized },
    });
  }
  return { address: normalized, result };
}

export async function getWalletAddressForActor(actorRef: string): Promise<string | null> {
  const row = await prisma.actorWallet.findFirst({
    where: { actorRef },
    orderBy: { createdAt: "asc" },
  });
  return row?.address ?? null;
}

export async function getActorRefForWallet(address: string): Promise<string | null> {
  const normalized = normalizeWalletAddress(address);
  if (!normalized) return null;
  const row = await prisma.actorWallet.findUnique({ where: { address: normalized } });
  return row?.actorRef ?? null;
}
