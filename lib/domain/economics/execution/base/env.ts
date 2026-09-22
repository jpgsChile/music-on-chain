import { createPublicClient, createWalletClient, defineChain, http, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MOC_SETTLEMENT_VERSION } from "./abi";
import {
  BASE_MAINNET_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  assertBaseSepoliaChainId,
  assertNotMainnetChainId,
} from "./sepoliaGuard";
import { createBaseSettlementAdapter, type BaseSettlementAdapter } from "./adapter";
import { createViemBaseChainPort } from "./viemPort";
import type { BaseSettlementConfig } from "./types";

export type HostEnv = Record<string, string | undefined>;

export type SettlementAdapterMode = "mock" | "base";

export function settlementAdapterMode(env: HostEnv = process.env): SettlementAdapterMode {
  const raw = (env.MOC_SETTLEMENT_ADAPTER ?? "mock").trim().toLowerCase();
  if (raw === "" || raw === "mock") return "mock";
  if (raw === "base") return "base";
  throw new Error("UNKNOWN_SETTLEMENT_ADAPTER");
}

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
  if (settlementAdapterMode(env) !== "base") return null;
  const chainId = Number(env.MOC_SETTLEMENT_CHAIN_ID ?? String(BASE_SEPOLIA_CHAIN_ID));
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
  assertBaseSepoliaChainId(chainId);
  if (!rpcUrl || !isAddress(contractAddress) || !isAddress(usdcAddress) || !isAddress(executorAddress)) {
    return null;
  }
  const assetSymbol = isAddress(assetField)
    ? env.MOC_SETTLEMENT_ASSET_SYMBOL?.trim() || "USDC"
    : assetField || "USDC";
  const tokenDecimals = Number(env.MOC_SETTLEMENT_TOKEN_DECIMALS ?? "6");
  return {
    chainId,
    rpcUrl,
    contractAddress,
    usdcAddress,
    executorAddress,
    assetSymbol,
    tokenDecimals,
    contractVersion: env.MOC_SETTLEMENT_CONTRACT_VERSION?.trim() || MOC_SETTLEMENT_VERSION,
  };
}

/** Adapter = base: missing RPC/addresses/executor is fatal. Never falls back to mock. */
export function requireBaseSettlementEnv(env: HostEnv = process.env): BaseRuntimeEnv {
  if (settlementAdapterMode(env) !== "base") throw new Error("ADAPTER_NOT_BASE");
  const parsed = readBaseSettlementEnv(env);
  if (!parsed) throw new Error("CONFIGURATION_ERROR");
  if (parsed.chainId === BASE_MAINNET_CHAIN_ID) throw new Error("MAINNET_FORBIDDEN");
  assertBaseSepoliaChainId(parsed.chainId);
  if (parsed.tokenDecimals !== 6) throw new Error("CONFIGURATION_ERROR");
  return parsed;
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
