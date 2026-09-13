import type { SettlementExecutionAdapter } from "./types";
import type { BaseSettlementAdapter } from "./base/adapter";
import { getWalletAddressForActor } from "@/lib/domain/actorWallet";

export function isBaseSettlementAdapter(
  adapter: SettlementExecutionAdapter
): adapter is BaseSettlementAdapter {
  return "kind" in adapter && (adapter as BaseSettlementAdapter).kind === "base";
}

/**
 * Wallet is a destination capability of the session Actor.
 * Client-supplied destinationCapability / x-actor-ref never authorizes settlement.
 */
export async function settlementDestinationForActor(actorRef: string): Promise<string | null> {
  return getWalletAddressForActor(actorRef);
}

export async function prepareSessionSettlement(input: {
  actorRef: string;
  adapter: SettlementExecutionAdapter;
}): Promise<{ destinationCapability: string | null; executionMode: "on-chain" | "off-chain" }> {
  const destinationCapability = await settlementDestinationForActor(input.actorRef);
  if (isBaseSettlementAdapter(input.adapter)) {
    if (!destinationCapability) throw new Error("MISSING_DESTINATION");
    return { destinationCapability, executionMode: "on-chain" };
  }
  return { destinationCapability, executionMode: "off-chain" };
}
