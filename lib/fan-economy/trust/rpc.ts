import { Keypair } from "@stellar/stellar-sdk";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import type { MaterializationChain } from "@/lib/fan-economy/materialization/service";
import { assertStellarTestnet, assertStellarTestnetRpc } from "@/lib/fan-economy/trust/networkGuard";
import type {
  CampaignTrustState,
  FanEconomyTrustExecution,
  RedemptionTrustState,
  RewardTrustState,
} from "@/lib/fan-economy/trust/port";
import {
  createSorobanMaterializationClient,
  keypairFromSecret,
} from "@/lib/fan-economy/trust/sorobanClient";

export type SorobanTrustConfig = {
  network: "testnet";
  rpcUrl: string;
  contractId: string;
  materializerPublicKey: string;
};

/**
 * Public Testnet coordinates. The materializer secret is never part of this object.
 * Incomplete configuration fails closed.
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

export type ControlledCapability = {
  actorRef: string;
  publicKey: string;
};

export function readControlledCapability(env: Record<string, string | undefined>): ControlledCapability | null {
  return readCapability(env, "MOC_TESTNET_CAPABILITY_ACTOR_REF", "MOC_TESTNET_CAPABILITY_PUBLIC_KEY", "MOC_TESTNET_CAPABILITY_SECRET");
}

/** Artist Testnet capability for reserve and reward authorization. Not the materializer and not the fan. */
export function readAuthorityCapability(env: Record<string, string | undefined>): ControlledCapability | null {
  return readCapability(env, "MOC_TESTNET_AUTHORITY_ACTOR_REF", "MOC_TESTNET_AUTHORITY_PUBLIC_KEY", "MOC_TESTNET_AUTHORITY_SECRET");
}

function readCapability(
  env: Record<string, string | undefined>,
  actorKey: string,
  publicKeyName: string,
  secretKey: string
): ControlledCapability | null {
  const actorRef = env[actorKey]?.trim() ?? "";
  const publicKey = env[publicKeyName]?.trim() ?? "";
  const secret = env[secretKey];
  if (!actorRef && !publicKey && !secret) return null;
  if (!actorRef || !publicKey || !secret) throw new FanEconomyError("CAPABILITY_NOT_CONFIGURED");
  keypairFromSecret(secret, publicKey);
  return { actorRef, publicKey };
}

function mapRedemption(row: {
  amount: string;
  targetHash: string;
  distributionHash: string;
  status: RedemptionTrustState["status"];
  materializationHash: string | null;
  grantId: string;
}): RedemptionTrustState {
  return {
    grantId: row.grantId,
    amount: row.amount,
    targetHash: row.targetHash,
    distributionHash: row.distributionHash,
    status: row.status,
    materializationHash: row.materializationHash,
  };
}

/**
 * Narrow Soroban adapter. Redeem, reserve, reward and reversal stay closed so
 * MOC_TRUST_EXECUTION cannot move economic truth onto the contract.
 * Lock and redemption reads use the SDK. The secret is read only when locking.
 */
export function createSorobanRpcTrust(
  config: SorobanTrustConfig,
  env: Record<string, string | undefined> = process.env
): FanEconomyTrustExecution {
  if (config.network !== "testnet") throw new Error("STELLAR_MAINNET_FORBIDDEN");
  const refuse = (): never => {
    throw new FanEconomyError("TRUST_RPC_NOT_READY");
  };
  const reader = () =>
    createSorobanMaterializationClient({
      contractId: config.contractId,
      rpcUrl: config.rpcUrl,
      materializer: Keypair.fromPublicKey(config.materializerPublicKey),
    });
  const signer = (): MaterializationChain => {
    const secret = env.MOC_MATERIALIZER_SECRET;
    if (!secret) throw new FanEconomyError("TRUST_NOT_CONFIGURED");
    const capabilitySecret = env.MOC_TESTNET_CAPABILITY_SECRET;
    const capabilityPublic = env.MOC_TESTNET_CAPABILITY_PUBLIC_KEY?.trim();
    return createSorobanMaterializationClient({
      contractId: config.contractId,
      rpcUrl: config.rpcUrl,
      materializer: keypairFromSecret(secret, config.materializerPublicKey),
      capability: capabilitySecret && capabilityPublic ? keypairFromSecret(capabilitySecret, capabilityPublic) : null,
    });
  };
  return {
    bindCapability: async () => refuse(),
    commitReserve: async (): Promise<CampaignTrustState> => refuse(),
    authorizeReward: async (): Promise<RewardTrustState> => refuse(),
    releaseReward: async (): Promise<RewardTrustState> => refuse(),
    redeem: async (): Promise<RedemptionTrustState> => refuse(),
    lockRedemption: async (input) => {
      const receipt = await signer().lockRedemption(input);
      return mapRedemption(receipt.redemption);
    },
    reverseRedemption: async (): Promise<RedemptionTrustState> => refuse(),
    getCampaignState: async () => refuse(),
    getReward: async () => refuse(),
    getRedemption: async (redemptionId) => {
      const row = await reader().getRedemption(redemptionId);
      return row ? mapRedemption(row) : null;
    },
  };
}
