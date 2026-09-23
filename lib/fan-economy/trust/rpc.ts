import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { assertStellarTestnet, assertStellarTestnetRpc } from "@/lib/fan-economy/trust/networkGuard";
import type {
  CampaignTrustState,
  FanEconomyTrustExecution,
  RedemptionTrustState,
  RewardTrustState,
} from "@/lib/fan-economy/trust/port";

export type SorobanTrustConfig = {
  network: "testnet";
  rpcUrl: string;
  contractId: string;
  materializerPublicKey: string;
};

/**
 * Reads the future testnet configuration. A secret key is never required here
 * and is never returned. Incomplete configuration fails closed.
 */
export function readSorobanTrustConfig(env: Record<string, string | undefined> = process.env): SorobanTrustConfig {
  assertStellarTestnet(env.STELLAR_NETWORK);
  const rpcUrl = env.STELLAR_RPC_URL?.trim() ?? "";
  const contractId = env.MOC_FAN_ECONOMY_CONTRACT_ID?.trim() ?? "";
  const materializerPublicKey = env.MOC_MATERIALIZER_PUBLIC_KEY?.trim() ?? "";
  if (!rpcUrl || !contractId || !materializerPublicKey) {
    throw new FanEconomyError("TRUST_NOT_CONFIGURED");
  }
  assertStellarTestnetRpc(rpcUrl);
  return { network: "testnet", rpcUrl, contractId, materializerPublicKey };
}

/**
 * Boundary that will replace the local harness. It does not call RPC and it
 * does not fall back to the harness. The materializer key, when later used,
 * authorizes lock. It does not independently verify Prisma.
 */
export function createSorobanRpcTrust(config: SorobanTrustConfig): FanEconomyTrustExecution {
  if (config.network !== "testnet") {
    throw new Error("STELLAR_MAINNET_FORBIDDEN");
  }
  const refuse = (): never => {
    throw new FanEconomyError("TRUST_RPC_NOT_READY");
  };
  return {
    bindCapability: async () => refuse(),
    commitReserve: async (): Promise<CampaignTrustState> => refuse(),
    authorizeReward: async (): Promise<RewardTrustState> => refuse(),
    releaseReward: async (): Promise<RewardTrustState> => refuse(),
    redeem: async (): Promise<RedemptionTrustState> => refuse(),
    lockRedemption: async (): Promise<RedemptionTrustState> => refuse(),
    reverseRedemption: async (): Promise<RedemptionTrustState> => refuse(),
    getCampaignState: async () => refuse(),
    getReward: async () => refuse(),
    getRedemption: async () => refuse(),
  };
}
