import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import type { FanEconomyTrustExecution } from "@/lib/fan-economy/trust/port";
import { createSorobanRpcTrust, readSorobanTrustConfig } from "@/lib/fan-economy/trust/rpc";

/**
 * Trust execution is off unless MOC_TRUST_EXECUTION=soroban.
 * That mode never falls back to the local harness. Incomplete or non-testnet
 * configuration fails closed. The harness is only for tests that construct it.
 */
export function configuredTrust(env: Record<string, string | undefined> = process.env): FanEconomyTrustExecution | null {
  const mode = env.MOC_TRUST_EXECUTION?.trim();
  if (!mode || mode === "off") return null;
  if (mode === "soroban") return createSorobanRpcTrust(readSorobanTrustConfig(env));
  throw new FanEconomyError("TRUST_NOT_CONFIGURED");
}
