import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import type { FanEconomyTrustExecution } from "@/lib/fan-economy/trust/port";

/**
 * Trust execution is off unless a later phase configures a real Soroban RPC
 * adapter. This function never invents a successful protocol result.
 */
export function configuredTrust(): FanEconomyTrustExecution | null {
  const mode = process.env.MOC_TRUST_EXECUTION?.trim();
  if (!mode || mode === "off") return null;
  throw new FanEconomyError("TRUST_NOT_CONFIGURED");
}
