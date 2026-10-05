import { Keypair } from "@stellar/stellar-sdk";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import type { MaterializationProof } from "@/lib/fan-economy/materialization/service";
import { assertStellarTestnet, assertStellarTestnetRpc } from "@/lib/fan-economy/trust/networkGuard";
import type { PrismaClient } from "@prisma/client";
import { createSorobanMaterializationClient, keypairFromSecret } from "@/lib/fan-economy/trust/sorobanClient";
import { readSorobanTrustConfig } from "@/lib/fan-economy/trust/rpc";

/**
 * Redemption-specific proof. Contract state decides the lock.
 * A local row alone is not publication.
 */
export async function readRedemptionProof(
  input: { redemptionId: string; fanActorRef: string },
  client: PrismaClient,
  env: Record<string, string | undefined> = process.env
): Promise<MaterializationProof | { published: false; economicRecord: false }> {
  const network = env.STELLAR_NETWORK?.trim();
  if (network) assertStellarTestnet(network);
  const rpc = env.STELLAR_RPC_URL?.trim();
  if (rpc) assertStellarTestnetRpc(rpc);
  const redemption = await client.redemption.findUnique({ where: { id: input.redemptionId } });
  if (!redemption || redemption.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
  const evidence = await client.economicChainEvidence.findFirst({
    where: { redemptionId: redemption.id },
    orderBy: { createdAt: "desc" },
  });
  let contractStatus: MaterializationProof["contractStatus"] = "missing";
  let materializationHash = evidence?.materializationHash ?? null;
  const configReady = Boolean(env.STELLAR_NETWORK && env.STELLAR_RPC_URL && env.MOC_FAN_ECONOMY_CONTRACT_ID && env.MOC_MATERIALIZER_PUBLIC_KEY);
  if (configReady) {
    try {
      const config = readSorobanTrustConfig(env);
      const secret = env.MOC_MATERIALIZER_SECRET;
      const reader = createSorobanMaterializationClient({
        contractId: config.contractId,
        rpcUrl: config.rpcUrl,
        materializer: secret
          ? keypairFromSecret(secret, config.materializerPublicKey)
          : Keypair.fromPublicKey(config.materializerPublicKey),
      });
      const chain = await reader.getRedemption(redemption.id);
      contractStatus = chain?.status ?? "missing";
      if (chain?.materializationHash) materializationHash = chain.materializationHash;
      const lockedMatch =
        chain?.status === "locked" &&
        evidence?.state === "confirmed" &&
        evidence.materializationHash != null &&
        chain.materializationHash?.toLowerCase() === evidence.materializationHash.toLowerCase();
      if (evidence?.state === "confirmed" && !lockedMatch) {
        return proof(evidence, redemption.revenueId, contractStatus, materializationHash, "inconsistent", "VERIFICATION_INCONSISTENT");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "STELLAR_MAINNET_FORBIDDEN") throw error;
      if (evidence?.state === "confirmed") {
        return proof(evidence, redemption.revenueId, "missing", materializationHash, "inconsistent", "VERIFICATION_INCONSISTENT");
      }
    }
  } else if (evidence?.state === "confirmed") {
    return proof(evidence, redemption.revenueId, "missing", materializationHash, "inconsistent", "VERIFICATION_INCONSISTENT");
  }
  if (!evidence) {
    return {
      redemptionId: redemption.id,
      revenueId: redemption.revenueId,
      network: "testnet",
      contractId: env.MOC_FAN_ECONOMY_CONTRACT_ID?.trim() || "",
      economicRecord: true,
      publicationState: "pending",
      contractStatus,
      materializationHash,
      transactionHash: null,
      ledger: null,
      publishedAt: null,
      verification: "pending",
      lastError: null,
    };
  }
  const verified =
    evidence.state === "confirmed" &&
    contractStatus === "locked" &&
    Boolean(evidence.transactionHash) &&
    evidence.ledger != null &&
    evidence.materializationHash != null &&
    materializationHash?.toLowerCase() === evidence.materializationHash.toLowerCase();
  return proof(
    evidence,
    redemption.revenueId,
    contractStatus,
    materializationHash,
    evidence.lastError === "PAYLOAD_CONFLICT" ? "conflict" : evidence.lastError === "VERIFICATION_INCONSISTENT" ? "inconsistent" : verified ? "verified" : evidence.state === "failed" ? "failed" : "pending",
    evidence.lastError
  );
}

function proof(
  evidence: {
    contractId: string;
    state: string;
    transactionHash: string | null;
    ledger: number | null;
    publishedAt: Date | null;
    lastError: string | null;
    redemptionId: string;
  },
  revenueId: string,
  contractStatus: MaterializationProof["contractStatus"],
  materializationHash: string | null,
  verification: MaterializationProof["verification"],
  lastError: string | null
): MaterializationProof {
  return {
    redemptionId: evidence.redemptionId,
    revenueId,
    network: "testnet",
    contractId: evidence.contractId,
    economicRecord: true,
    publicationState: evidence.state as MaterializationProof["publicationState"],
    contractStatus,
    materializationHash,
    transactionHash: evidence.transactionHash,
    ledger: evidence.ledger,
    publishedAt: evidence.publishedAt?.toISOString() ?? null,
    verification,
    lastError,
  };
}

/** Historical demo entry. It no longer shells out to the Stellar CLI. */
export async function readTestnetProof(
  env: Record<string, string | undefined> = process.env
): Promise<{ published: false }> {
  const network = env.STELLAR_NETWORK?.trim();
  if (network) assertStellarTestnet(network);
  const rpc = env.STELLAR_RPC_URL?.trim();
  if (rpc) assertStellarTestnetRpc(rpc);
  return { published: false };
}
