import type { PrismaClient } from "@prisma/client";
import { canonicalCommitments } from "@/lib/fan-economy/materialization/service";
import {
  stellarExpertContractUrl,
  stellarExpertTransactionUrl,
} from "@/lib/fan-economy/materialization/presentation";

/** The only economic record this public projection may read. Not client input. */
export const CERTIFIED_HACKATHON_REDEMPTION_ID = "redeem-b3e4df75-2f1";

const CONTRACT_ID = /^C[A-Z2-7]{55}$/;
const TX_HASH = /^[0-9a-f]{64}$/i;

export type PublicMoney = {
  units: string;
  scale: number;
  asset: string;
  label: string;
};

export type PublicChainSnapshot = {
  status: "committed" | "locked" | "reversed";
  materializationHash: string | null;
  contractId?: string | null;
};

export type PublicProofReadOptions = {
  /** Optional current RPC read. It cannot change persisted evidence. */
  liveRead?: (redemptionId: string) => Promise<PublicChainSnapshot | null>;
  liveTimeoutMs?: number;
};

export type CertifiedProofCommitments = {
  redemption: string;
  revenue: string;
  distribution: string;
  materialization: string;
};

export type CertifiedHackathonProof =
  | {
      available: true;
      redemptionId: string;
      revenueId: string;
      releaseTitle: string;
      support: PublicMoney;
      gross: PublicMoney;
      artistParticipation: PublicMoney;
      economicStatus: "accrued" | "settled" | "recorded";
      economicRecord: true;
      persistedVerification: "verified" | "recorded";
      protocolState: "locked" | "not-locked";
      network: string | null;
      contractId: string | null;
      transactionHash: string | null;
      ledger: number | null;
      commitments: CertifiedProofCommitments | null;
      transactionUrl: string | null;
      contractUrl: string | null;
      liveNetworkStatus: "confirmed" | "unavailable";
    }
  | {
      available: false;
      liveNetworkStatus: "unavailable";
    };

/**
 * Public receipt for the certified hackathon operation.
 * SELECT only. The redemption id is fixed here. Browser selectors are ignored.
 */
export async function readCertifiedHackathonProof(
  client: PrismaClient,
  options: PublicProofReadOptions = {}
): Promise<CertifiedHackathonProof> {
  const redemptionId = CERTIFIED_HACKATHON_REDEMPTION_ID;
  const redemption = await client.redemption.findUnique({ where: { id: redemptionId } });
  if (!redemption) return { available: false, liveNetworkStatus: "unavailable" };

  const [release, revenue, evidence] = await Promise.all([
    client.musicRelease.findUnique({ where: { id: redemption.releaseId }, select: { title: true } }),
    client.economicRevenue.findUnique({
      where: { id: redemption.revenueId },
      include: { entitlements: true },
    }),
    client.economicChainEvidence.findFirst({
      where: { redemptionId: redemption.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const shares = (revenue?.entitlements ?? []).map((row) => ({
    actorRef: row.actorRef,
    shareBps: row.shareBps,
  }));
  const commitments = revenue
    ? canonicalCommitments({
        redemptionId: redemption.id,
        revenueId: revenue.id,
        shares,
      })
    : null;

  const network = evidence?.network === "testnet" ? "testnet" : null;
  const contractId = evidence?.contractId && CONTRACT_ID.test(evidence.contractId) ? evidence.contractId : null;
  const transactionHash =
    evidence?.transactionHash && TX_HASH.test(evidence.transactionHash) ? evidence.transactionHash.toLowerCase() : null;
  const ledger = evidence?.ledger ?? null;
  const storedMaterialization = evidence?.materializationHash?.toLowerCase() ?? null;
  const persistedVerification =
    evidence?.state === "confirmed" &&
    network === "testnet" &&
    contractId != null &&
    transactionHash != null &&
    ledger != null &&
    storedMaterialization != null &&
    commitments != null &&
    revenue?.id === redemption.revenueId &&
    storedMaterialization === commitments.materializationHash.toLowerCase()
      ? "verified"
      : "recorded";

  const liveNetworkStatus = await observeLive(options, redemptionId, {
    materializationHash: storedMaterialization,
    contractId,
    persistedVerification,
  });

  const statuses = revenue?.entitlements.map((row) => row.status) ?? [];
  const economicStatus = statuses.length > 0 && statuses.every((status) => status === "accrued")
    ? "accrued"
    : statuses.some((status) => status === "settled")
      ? "settled"
      : "recorded";

  const participationUnits = (revenue?.entitlements ?? []).reduce((sum, row) => sum + BigInt(row.units), 0n);

  return {
    available: true,
    redemptionId: redemption.id,
    revenueId: redemption.revenueId,
    releaseTitle: release?.title ?? "",
    support: money(redemption.units, redemption.scale, redemption.asset),
    gross: money(revenue?.grossUnits ?? redemption.units, revenue?.scale ?? redemption.scale, revenue?.asset ?? redemption.asset),
    artistParticipation: money(
      participationUnits.toString(),
      revenue?.scale ?? redemption.scale,
      revenue?.asset ?? redemption.asset
    ),
    economicStatus,
    economicRecord: true,
    persistedVerification,
    protocolState: persistedVerification === "verified" ? "locked" : "not-locked",
    network,
    contractId,
    transactionHash,
    ledger,
    commitments: commitments
      ? {
          redemption: commitments.redemptionHash,
          revenue: commitments.revenueHash,
          distribution: commitments.distributionHash,
          materialization: commitments.materializationHash,
        }
      : null,
    transactionUrl: persistedVerification === "verified" ? stellarExpertTransactionUrl(network, transactionHash) : null,
    contractUrl: persistedVerification === "verified" ? stellarExpertContractUrl(network, contractId) : null,
    liveNetworkStatus,
  };
}

function money(units: string, scale: number, asset: string): PublicMoney {
  return { units, scale, asset, label: formatPublicMoney(units, scale, asset) };
}

export function formatPublicMoney(units: string, scale: number, asset: string): string {
  const negative = units.startsWith("-");
  const raw = negative ? units.slice(1) : units;
  const padded = raw.padStart(Math.max(scale, 0) + 1, "0");
  const whole = scale > 0 ? padded.slice(0, padded.length - scale) : padded;
  const frac = scale > 0 ? padded.slice(padded.length - scale).slice(0, 2).padEnd(2, "0") : "00";
  return `${negative ? "-" : ""}$${whole || "0"}.${frac} ${asset}`;
}

async function observeLive(
  options: PublicProofReadOptions,
  redemptionId: string,
  persisted: { materializationHash: string | null; contractId: string | null; persistedVerification: "verified" | "recorded" }
): Promise<"confirmed" | "unavailable"> {
  if (!options.liveRead || persisted.persistedVerification !== "verified" || !persisted.materializationHash || !persisted.contractId) {
    return "unavailable";
  }
  const timeoutMs = options.liveTimeoutMs ?? 4_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const snapshot = await Promise.race([
      options.liveRead(redemptionId),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("LIVE_TIMEOUT")), timeoutMs);
      }),
    ]);
    if (!snapshot || snapshot.status !== "locked" || !snapshot.materializationHash) return "unavailable";
    if (snapshot.contractId && snapshot.contractId !== persisted.contractId) return "unavailable";
    if (snapshot.materializationHash.toLowerCase() !== persisted.materializationHash) return "unavailable";
    return "confirmed";
  } catch {
    return "unavailable";
  } finally {
    if (timer) clearTimeout(timer);
  }
}
