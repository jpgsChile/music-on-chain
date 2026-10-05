import { scValToNative, xdr } from "@stellar/stellar-sdk";
import type { ObservedEvent } from "@/lib/fan-economy/events/decide";

function readAmount(value: unknown): string | null {
  if (typeof value === "bigint" || typeof value === "number") return String(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (value && typeof value === "object" && "amount" in value) {
    return readAmount((value as { amount: unknown }).amount);
  }
  return null;
}

function readHash(value: unknown): string | null {
  if (Buffer.isBuffer(value) && value.length === 32) return value.toString("hex");
  if (value instanceof Uint8Array && value.length === 32) return Buffer.from(value).toString("hex");
  if (typeof value === "string" && /^[0-9a-f]{64}$/i.test(value)) return value.toLowerCase();
  return null;
}

function contractOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "contractId" in value && typeof (value as { contractId: unknown }).contractId === "function") {
    return (value as { contractId: () => string }).contractId();
  }
  return "";
}

/** Decodes one Soroban event into the bounded fields used for reconciliation. */
export function parseContractEvent(event: {
  id: string;
  ledger: number;
  txHash: string;
  contractId?: unknown;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
  inSuccessfulContractCall: boolean;
}): ObservedEvent {
  const topics = event.topic.map((topic) => scValToNative(topic));
  const eventType = typeof topics[0] === "string" ? topics[0] : "";
  return {
    pagingToken: event.id,
    ledger: event.ledger,
    transactionHash: event.txHash,
    contractId: contractOf(event.contractId),
    eventType,
    canonicalHash: readHash(topics[1]),
    amount: readAmount(scValToNative(event.value)),
    successful: event.inSuccessfulContractCall,
  };
}
