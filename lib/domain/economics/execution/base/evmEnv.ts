import type { HostEnv } from "./env";
import { BASE_MAINNET_CHAIN_ID } from "./sepoliaGuard";

export type EvmEnvProfile = "local" | "fork" | "base-sepolia";

/**
 * Host profile for settlement execution tests.
 * Defaults to `local`. Mainnet aliases are rejected — never a development target.
 */
export function readEvmEnvProfile(env: HostEnv = process.env): EvmEnvProfile {
  const raw = (env.EVM_ENV ?? env.MOC_EVM_ENV ?? "local").trim().toLowerCase();
  if (
    raw === "mainnet" ||
    raw === "base-mainnet" ||
    raw === "8453" ||
    raw === String(BASE_MAINNET_CHAIN_ID)
  ) {
    throw new Error("MAINNET_FORBIDDEN");
  }
  if (raw === "fork" || raw === "base-sepolia-fork") return "fork";
  if (raw === "base-sepolia" || raw === "sepolia") return "base-sepolia";
  if (raw === "local" || raw === "evm-local" || raw === "ganache") return "local";
  throw new Error("UNKNOWN_EVM_ENV");
}
