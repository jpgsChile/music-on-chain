import { spawnSync } from "node:child_process";
import { assertStellarTestnet, assertStellarTestnetRpc } from "@/lib/fan-economy/trust/networkGuard";
import {
  actorHash,
  assignmentHash,
  campaignHash,
  hex32,
  redemptionHash,
} from "@/lib/fan-economy/trust/canonical";

/** Public coordinates of the executed Testnet flow. Not a secret and not a simulated result. */
export const TESTNET_CONTRACT_ID = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const RPC_URL = "https://soroban-testnet.stellar.org";
const ARTIST_REF = "moc:actor:e5e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5";
const FAN_REF = "moc:actor:f6f6f6f6-f6f6-46f6-86f6-f6f6f6f6f6f6";
const CAMPAIGN_ID = "campaign:testnet-flow-001";
const ASSIGNMENT_ID = "assignment:testnet-flow-001";
const REDEMPTION_ID = "redemption:testnet-flow-001";
const READ_SOURCE = "GDFPRU2GJNKIEIBNDXDWBJBQP6D2RFKZAHINK2DLJUR7PLF3X6MTMDTX";

export type TestnetProof = {
  published: true;
  network: "testnet";
  contractId: string;
  contractUrl: string;
  artist: { actorRef: string; actorHash: string; capability: string | null };
  fan: { actorRef: string; actorHash: string; capability: string | null };
  campaign: { committed: string; outstanding: string; scale: number } | null;
  reward: { authorized: string; consumed: string; released: string; remaining: string; actorHash: string } | null;
  redemption: {
    amount: string;
    status: "committed" | "locked" | "reversed";
    targetHash: string;
    distributionHash: string;
    materializationHash: string | null;
  } | null;
  transactions: { hash: string; url: string }[];
};

function contractId(env: Record<string, string | undefined>): string {
  const configured = env.MOC_FAN_ECONOMY_CONTRACT_ID?.trim();
  return configured || TESTNET_CONTRACT_ID;
}

function assertReadable(env: Record<string, string | undefined>): void {
  const network = env.STELLAR_NETWORK?.trim();
  if (network) assertStellarTestnet(network);
  const rpc = env.STELLAR_RPC_URL?.trim();
  if (rpc) assertStellarTestnetRpc(rpc);
}

function invoke(id: string, fn: string, args: string[]): unknown {
  const result = spawnSync(
    "stellar",
    ["contract", "invoke", "--id", id, "--network", "testnet", "--send", "no", "--source-account", READ_SOURCE, "--", fn, ...args],
    { encoding: "utf8" }
  );
  if (result.status !== 0) return null;
  const line = result.stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function statusName(code: number): "committed" | "locked" | "reversed" | null {
  if (code === 1) return "committed";
  if (code === 2) return "locked";
  if (code === 3) return "reversed";
  return null;
}

async function transactionHashes(id: string): Promise<{ hash: string; url: string }[]> {
  const latest = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "moc-demo" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger" }),
  }).then((response) => response.json() as Promise<{ result?: { sequence?: number } }>);
  const sequence = latest.result?.sequence;
  if (!sequence) return [];
  const events = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "moc-demo" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "getEvents",
      params: {
        startLedger: Math.max(1, sequence - 2000),
        filters: [{ contractIds: [id] }],
        pagination: { limit: 20 },
      },
    }),
  }).then((response) => response.json() as Promise<{ result?: { events?: { txHash?: string }[] } }>);
  const seen = new Set<string>();
  const hashes: { hash: string; url: string }[] = [];
  for (const event of events.result?.events ?? []) {
    const hash = event.txHash?.trim();
    if (!hash || seen.has(hash) || !/^[0-9a-f]{64}$/.test(hash)) continue;
    seen.add(hash);
    hashes.push({ hash, url: `https://stellar.expert/explorer/testnet/tx/${hash}` });
  }
  return hashes;
}

export async function readTestnetProof(env: Record<string, string | undefined> = process.env): Promise<TestnetProof | { published: false }> {
  assertReadable(env);
  const id = contractId(env);
  if (!id.startsWith("C")) return { published: false };
  const artistActorHash = hex32(actorHash(ARTIST_REF));
  const fanActorHash = hex32(actorHash(FAN_REF));
  const campaign = hex32(campaignHash(CAMPAIGN_ID));
  const grant = hex32(assignmentHash(ASSIGNMENT_ID));
  const redemption = hex32(redemptionHash(REDEMPTION_ID));
  const artistCapability = invoke(id, "get_actor_capability", ["--actor", artistActorHash]);
  const fanCapability = invoke(id, "get_actor_capability", ["--actor", fanActorHash]);
  const campaignState = invoke(id, "get_campaign_state", ["--campaign_id", campaign]) as {
    committed?: string;
    outstanding?: string;
    asset?: { scale?: number };
  } | null;
  const rewardState = invoke(id, "get_reward", ["--grant_id", grant]) as {
    authorized?: string;
    consumed?: string;
    released?: string;
    actor_hash?: string;
  } | null;
  const redemptionState = invoke(id, "get_redemption", ["--redemption_id", redemption]) as {
    amount?: string;
    status?: number;
    target_hash?: string;
    distribution_hash?: string;
    materialization_hash?: string | null;
  } | null;
  if (!campaignState && !rewardState && !redemptionState) return { published: false };
  const status = redemptionState ? statusName(Number(redemptionState.status)) : null;
  const transactions = await transactionHashes(id).catch(() => []);
  return {
    published: true,
    network: "testnet",
    contractId: id,
    contractUrl: `https://stellar.expert/explorer/testnet/contract/${id}`,
    artist: {
      actorRef: ARTIST_REF,
      actorHash: artistActorHash,
      capability: typeof artistCapability === "string" ? artistCapability : null,
    },
    fan: {
      actorRef: FAN_REF,
      actorHash: fanActorHash,
      capability: typeof fanCapability === "string" ? fanCapability : null,
    },
    campaign: campaignState?.committed
      ? {
          committed: campaignState.committed,
          outstanding: campaignState.outstanding ?? "0",
          scale: campaignState.asset?.scale ?? 0,
        }
      : null,
    reward: rewardState?.authorized
      ? {
          authorized: rewardState.authorized,
          consumed: rewardState.consumed ?? "0",
          released: rewardState.released ?? "0",
          remaining: (
            BigInt(rewardState.authorized) -
            BigInt(rewardState.consumed ?? "0") -
            BigInt(rewardState.released ?? "0")
          ).toString(),
          actorHash: rewardState.actor_hash ?? fanActorHash,
        }
      : null,
    redemption:
      redemptionState?.amount && status
        ? {
            amount: redemptionState.amount,
            status,
            targetHash: redemptionState.target_hash ?? "",
            distributionHash: redemptionState.distribution_hash ?? "",
            materializationHash: redemptionState.materialization_hash ?? null,
          }
        : null,
    transactions,
  };
}
