import fs from "node:fs";
import path from "node:path";
import { isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MOC_SETTLEMENT_VERSION } from "./abi";
import {
  BASE_SEPOLIA_CHAIN_ID,
  assertBaseSepoliaChainId,
} from "./sepoliaGuard";
import type { BaseRuntimeEnv, HostEnv } from "./env";

export type SepoliaSignerPreview = {
  executorAddress: Address;
  chainId: number;
  network: "base-sepolia";
};

export type SepoliaLiveCredentials = {
  rpcUrl: string;
  executorKey: Hex;
  executorAddress: Address;
  chainId: number;
  contractAddress?: Address;
  assetAddress?: Address;
  assetSymbol: string;
  tokenDecimals: number;
  contractVersion: string;
};

function first(env: HostEnv, names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim() ?? "";
    if (value) return value;
  }
  return "";
}

const SEPOLIA_ENV_KEYS = [
  "BASE_SEPOLIA_RPC_URL",
  "BASE_EXECUTOR_PRIVATE_KEY",
  "MOC_SETTLEMENT_ADDRESS",
  "MOC_SETTLEMENT_ASSET",
  "MOC_SETTLEMENT_RPC_URL",
  "MOC_SETTLEMENT_CONTRACT_ADDRESS",
  "MOC_SETTLEMENT_USDC_ADDRESS",
  "MOC_SETTLEMENT_EXECUTOR_ADDRESS",
  "MOC_SETTLEMENT_CHAIN_ID",
  "MOC_SETTLEMENT_ASSET_SYMBOL",
  "MOC_SETTLEMENT_TOKEN_DECIMALS",
  "MOC_SETTLEMENT_CONTRACT_VERSION",
  "MOC_SETTLEMENT_ADAPTER",
] as const;

/** Load Sepolia keys from local env files into process.env if missing. Never logs values. */
export function loadSepoliaEnvFiles(cwd = process.cwd()): void {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(cwd, name);
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      if (!SEPOLIA_ENV_KEYS.includes(key as (typeof SEPOLIA_ENV_KEYS)[number])) continue;
      if (process.env[key]?.trim()) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

export function pickSepoliaRpcUrl(env: HostEnv = process.env): string {
  return first(env, ["BASE_SEPOLIA_RPC_URL", "MOC_SETTLEMENT_RPC_URL"]);
}

export function pickSepoliaContractAddress(env: HostEnv = process.env): string {
  return first(env, ["MOC_SETTLEMENT_ADDRESS", "MOC_SETTLEMENT_CONTRACT_ADDRESS"]);
}

export function pickSepoliaAssetAddress(env: HostEnv = process.env): string {
  const asset = first(env, ["MOC_SETTLEMENT_ASSET"]);
  if (asset && isAddress(asset)) return asset;
  return first(env, ["MOC_SETTLEMENT_USDC_ADDRESS"]);
}

export function pickSepoliaAssetSymbol(env: HostEnv = process.env): string {
  const asset = first(env, ["MOC_SETTLEMENT_ASSET"]);
  if (asset && !isAddress(asset)) return asset;
  return first(env, ["MOC_SETTLEMENT_ASSET_SYMBOL"]) || "USDC";
}

/**
 * Reads the executor key. Never logs it. Returns null when absent.
 */
export function pickExecutorPrivateKey(env: HostEnv = process.env): Hex | null {
  const value = first(env, ["BASE_EXECUTOR_PRIVATE_KEY"]);
  if (!value) return null;
  const normalized = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("INVALID_EXECUTOR_KEY_FORMAT");
  }
  return normalized as Hex;
}

export function previewExecutorSigner(key: Hex): SepoliaSignerPreview {
  const account = privateKeyToAccount(key);
  return {
    executorAddress: account.address,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    network: "base-sepolia",
  };
}

export function hasSepoliaLiveCredentials(env: HostEnv = process.env): boolean {
  if (env === process.env) loadSepoliaEnvFiles();
  try {
    return Boolean(pickSepoliaRpcUrl(env) && pickExecutorPrivateKey(env));
  } catch {
    return false;
  }
}

export function readSepoliaLiveCredentials(
  env: HostEnv = process.env
): SepoliaLiveCredentials {
  if (env === process.env) loadSepoliaEnvFiles();
  const rpcUrl = pickSepoliaRpcUrl(env);
  if (!rpcUrl) throw new Error("CONFIGURATION_ERROR");
  const executorKey = pickExecutorPrivateKey(env);
  if (!executorKey) throw new Error("SIGNER_ERROR");
  const preview = previewExecutorSigner(executorKey);
  const chainId = Number(env.MOC_SETTLEMENT_CHAIN_ID ?? BASE_SEPOLIA_CHAIN_ID);
  assertBaseSepoliaChainId(chainId);
  const contract = pickSepoliaContractAddress(env);
  const asset = pickSepoliaAssetAddress(env);
  const configuredExecutor = env.MOC_SETTLEMENT_EXECUTOR_ADDRESS?.trim() ?? "";
  if (configuredExecutor && isAddress(configuredExecutor)) {
    if (configuredExecutor.toLowerCase() !== preview.executorAddress.toLowerCase()) {
      throw new Error("EXECUTOR_KEY_ADDRESS_MISMATCH");
    }
  }
  return {
    rpcUrl,
    executorKey,
    executorAddress: preview.executorAddress,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    contractAddress: contract && isAddress(contract) ? contract : undefined,
    assetAddress: asset && isAddress(asset) ? asset : undefined,
    assetSymbol: pickSepoliaAssetSymbol(env),
    tokenDecimals: Number(env.MOC_SETTLEMENT_TOKEN_DECIMALS ?? "6") || 6,
    contractVersion: env.MOC_SETTLEMENT_CONTRACT_VERSION?.trim() || MOC_SETTLEMENT_VERSION,
  };
}

export function toSepoliaRuntimeEnv(
  creds: SepoliaLiveCredentials,
  addresses: { contractAddress: Address; assetAddress: Address }
): BaseRuntimeEnv {
  return {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    rpcUrl: creds.rpcUrl,
    contractAddress: addresses.contractAddress,
    usdcAddress: addresses.assetAddress,
    executorAddress: creds.executorAddress,
    assetSymbol: creds.assetSymbol,
    tokenDecimals: creds.tokenDecimals,
    contractVersion: creds.contractVersion,
  };
}
