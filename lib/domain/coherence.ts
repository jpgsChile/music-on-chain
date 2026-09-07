import { looksLikeEvmAddress } from "@/lib/c-bind/fromPrivy";

export type AttachResult = "ok" | "already" | "conflict" | "invalid";

export function normalizeWalletAddress(address: string | null | undefined): string | null {
  const value = address?.trim().toLowerCase() || "";
  if (!value) return null;
  if (!looksLikeEvmAddress(value)) return null;
  return value;
}

/** Wallet may attach to an Actor; it must not become the Actor. */
export function canAttachWallet(
  existingOwnerActorRef: string | null | undefined,
  actorRef: string
): Exclude<AttachResult, "invalid"> {
  if (!existingOwnerActorRef) return "ok";
  if (existingOwnerActorRef === actorRef) return "already";
  return "conflict";
}

/** Orphan channel profiles may be claimed; owned profiles must not be stolen. */
export function canClaimProfile(
  profileActorRef: string | null | undefined,
  actorRef: string
): Exclude<AttachResult, "invalid"> {
  if (!profileActorRef) return "ok";
  if (profileActorRef === actorRef) return "already";
  return "conflict";
}
