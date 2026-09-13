import { createPublicClient, createWalletClient, defineChain, http, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MOC_SETTLEMENT_VERSION } from "./abi";
import { BASE_MAINNET_CHAIN_ID, assertNotMainnetChainId } from "./sepoliaGuard";
import { createBaseSettlementAdapter, type BaseSettlementAdapter } from "./adapter";
import { createViemBaseChainPort } from "./viemPort";
import type { BaseSettlementConfig } from "./types";

export type HostEnv = Record<string, string | undefined>;

export type BaseRuntimeEnv = {
  chainId: number;
  rpcUrl: string;
  contractAddress: Address;
  usdcAddress: Address;
  executorAddress: Address;
  assetSymbol: string;
  tokenDecimals: number;
  contractVersion: string;
};

/**
 * Reads execution-layer addresses from the host environment.
 * Never reads or returns a private key.
 */
export function readBaseSettlementEnv(
  env: HostEnv = process.env
): BaseRuntimeEnv | null {
  if ((env.MOC_SETTLEMENT_ADAPTER ?? "mock").trim() !== "base") return null;
  const chainId = Number(env.MOC_SETTLEMENT_CHAIN_ID ?? "84532");
  const rpcUrl = (env.BASE_SEPOLIA_RPC_URL ?? env.MOC_SETTLEMENT_RPC_URL)?.trim() ?? "";
  const contractAddress =
    (env.MOC_SETTLEMENT_ADDRESS ?? env.MOC_SETTLEMENT_CONTRACT_ADDRESS)?.trim() ?? "";
  const assetField = env.MOC_SETTLEMENT_ASSET?.trim() ?? "";
  const usdcAddress = isAddress(assetField)
    ? assetField
    : (env.MOC_SETTLEMENT_USDC_ADDRESS?.trim() ?? "");
  const executorAddress = env.MOC_SETTLEMENT_EXECUTOR_ADDRESS?.trim() ?? "";
  if (!Number.isInteger(chainId) || chainId <= 0) return null;
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    throw new Error("MAINNET_FORBIDDEN");
  }
  if (!rpcUrl || !isAddress(contractAddress) || !isAddress(usdcAddress) || !isAddress(executorAddress)) {
    return null;
  }
  const assetSymbol = isAddress(assetField)
    ? env.MOC_SETTLEMENT_ASSET_SYMBOL?.trim() || "USDC"
    : assetField || "USDC";
  return {
    chainId,
    rpcUrl,
    contractAddress,
    usdcAddress,
    executorAddress,
    assetSymbol,
    tokenDecimals: Number(env.MOC_SETTLEMENT_TOKEN_DECIMALS ?? "6"),
    contractVersion: env.MOC_SETTLEMENT_CONTRACT_VERSION?.trim() || MOC_SETTLEMENT_VERSION,
  };
}

export function toBaseSettlementConfig(env: BaseRuntimeEnv): BaseSettlementConfig {
  return {
    chainId: env.chainId,
    contractAddress: env.contractAddress,
    usdcAddress: env.usdcAddress,
    executorAddress: env.executorAddress,
    assetSymbol: env.assetSymbol,
    tokenDecimals: env.tokenDecimals,
    contractVersion: env.contractVersion,
    waitForConfirmation: true,
    receiptTimeoutMs: envRpcTimeout(process.env),
  };
}

function envRpcTimeout(env: HostEnv): number {
  const n = Number(env.MOC_SETTLEMENT_RECEIPT_TIMEOUT_MS ?? "20000");
  return Number.isFinite(n) && n > 0 ? n : 20_000;
}

/**
 * Host-injected signer. The private key is an argument, never loaded from .env.example.
 */
export function createBaseSettlementAdapterWithSigner(input: {
  env: BaseRuntimeEnv;
  executorKey: Hex;
}): BaseSettlementAdapter {
  assertNotMainnetChainId(input.env.chainId);
  const account = privateKeyToAccount(input.executorKey);
  if (account.address.toLowerCase() !== input.env.executorAddress.toLowerCase()) {
    throw new Error("EXECUTOR_KEY_ADDRESS_MISMATCH");
  }
  const chain = defineChain({
    id: input.env.chainId,
    name: "moc-settlement",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [input.env.rpcUrl] } },
  });
  const transport = http(input.env.rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ chain, transport, account });
  return createBaseSettlementAdapter({
    config: toBaseSettlementConfig(input.env),
    chain: createViemBaseChainPort({
      publicClient,
      walletClient,
      contractAddress: input.env.contractAddress,
      usdcAddress: input.env.usdcAddress,
      account,
    }),
  });
}
