export type ReserveView = {
  authorityActor: string;
  assetHash: string;
  scale: string;
  committed: string;
  outstanding?: string;
};

export type GrantView = {
  campaignId: string;
  actorHash: string;
  authorized: string;
  consumed?: string;
  released?: string;
};

export type EnsureStep = "ready" | "create" | "conflict" | "not-ready";

function same(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/** Reads the chain first. Creates only when absent and the authority capability is available. */
export function decideReserve(input: {
  chain: ReserveView | null;
  authorityActor: string;
  assetHash: string;
  scale: string;
  committedUnits: string;
  authorityAvailable: boolean;
}): EnsureStep {
  if (!input.chain) return input.authorityAvailable ? "create" : "not-ready";
  const compatible =
    same(input.chain.authorityActor, input.authorityActor) &&
    same(input.chain.assetHash, input.assetHash) &&
    input.chain.scale === input.scale &&
    BigInt(input.chain.committed) >= BigInt(input.committedUnits);
  return compatible ? "ready" : "conflict";
}

export function decideReward(input: {
  chain: GrantView | null;
  campaignId: string;
  actorHash: string;
  authorized: string;
  authorityAvailable: boolean;
}): EnsureStep {
  if (!input.chain) return input.authorityAvailable ? "create" : "not-ready";
  const compatible =
    same(input.chain.campaignId, input.campaignId) &&
    same(input.chain.actorHash, input.actorHash) &&
    input.chain.authorized === input.authorized;
  return compatible ? "ready" : "conflict";
}
