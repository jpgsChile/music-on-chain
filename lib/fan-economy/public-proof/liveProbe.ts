import { Keypair } from "@stellar/stellar-sdk";
import type { PublicChainSnapshot } from "@/lib/fan-economy/public-proof/certifiedHackathonProof";
import { readSorobanTrustConfig } from "@/lib/fan-economy/trust/rpc";
import { createSorobanMaterializationClient } from "@/lib/fan-economy/trust/sorobanClient";

/**
 * Optional read of get_redemption. Uses the materializer public key only.
 * This probe never submits a transaction.
 */
export function publicLiveRead(
  env: Record<string, string | undefined> = process.env
): ((redemptionId: string) => Promise<PublicChainSnapshot | null>) | undefined {
  let config;
  try {
    config = readSorobanTrustConfig(env);
  } catch {
    return undefined;
  }
  return async (redemptionId: string) => {
    const reader = createSorobanMaterializationClient({
      contractId: config.contractId,
      rpcUrl: config.rpcUrl,
      materializer: Keypair.fromPublicKey(config.materializerPublicKey),
    });
    const chain = await reader.getRedemption(redemptionId);
    if (!chain) return null;
    return {
      status: chain.status,
      materializationHash: chain.materializationHash,
      contractId: config.contractId,
    };
  };
}
