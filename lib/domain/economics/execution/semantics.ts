import type { ExecutionMode } from "./types";

type ReceiptLike = {
  executionMode?: ExecutionMode | string;
  externalRef?: string | null;
  metadata?: Record<string, unknown> | null;
};

function meta(receipt: ReceiptLike): Record<string, unknown> {
  return receipt.metadata && typeof receipt.metadata === "object" ? receipt.metadata : {};
}

/** Mock adapter outcome CONFIRMED is not on-chain confirmation. */
export function isSimulatedMockReceipt(receipt: ReceiptLike): boolean {
  const m = meta(receipt);
  if (m.adapter === "mock") return true;
  if (m.simulated === true) return true;
  if (m.onChain === false && m.adapter !== "base") return true;
  const ref = receipt.externalRef ?? "";
  return typeof ref === "string" && ref.startsWith("mock:");
}

export function isOnChainReceipt(receipt: ReceiptLike): boolean {
  if (isSimulatedMockReceipt(receipt)) return false;
  const m = meta(receipt);
  if (m.adapter === "base") return true;
  if (m.onChain === true) return true;
  return receipt.executionMode === "on-chain";
}
