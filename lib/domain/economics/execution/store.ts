import type {
  ExecutionLifecycle,
  ExecutionRequest,
  SettlementIntent,
  SettlementReceipt,
} from "./types";
import { outcomeToLifecycle } from "./transitions";

export type ExecutionStore = {
  getIntent(intentRef: string): SettlementIntent | null;
  getIntentByEntitlement(entitlementId: string): SettlementIntent | null;
  putIntent(intent: SettlementIntent): void;
  getRequest(requestRef: string): ExecutionRequest | null;
  listRequests(intentRef: string): ExecutionRequest[];
  putRequest(request: ExecutionRequest): void;
  latestReceipt(intentRef: string): SettlementReceipt | null;
  listReceipts(intentRef: string): SettlementReceipt[];
  putReceipt(receipt: SettlementReceipt): void;
  lifecycle(intentRef: string): ExecutionLifecycle;
};

export function createMemoryExecutionStore(): ExecutionStore {
  const intents = new Map<string, SettlementIntent>();
  const byEntitlement = new Map<string, string>();
  const requests = new Map<string, ExecutionRequest>();
  const receipts: SettlementReceipt[] = [];

  return {
    getIntent(intentRef) {
      return intents.get(intentRef) ?? null;
    },
    getIntentByEntitlement(entitlementId) {
      const ref = byEntitlement.get(entitlementId);
      return ref ? intents.get(ref) ?? null : null;
    },
    putIntent(intent) {
      intents.set(intent.intentRef, intent);
      byEntitlement.set(intent.entitlementId, intent.intentRef);
    },
    getRequest(requestRef) {
      return requests.get(requestRef) ?? null;
    },
    listRequests(intentRef) {
      return [...requests.values()].filter((row) => row.intentRef === intentRef);
    },
    putRequest(request) {
      requests.set(request.requestRef, request);
    },
    latestReceipt(intentRef) {
      const list = receipts.filter((row) => row.intentRef === intentRef);
      return list[list.length - 1] ?? null;
    },
    listReceipts(intentRef) {
      return receipts.filter((row) => row.intentRef === intentRef);
    },
    putReceipt(receipt) {
      receipts.push(receipt);
    },
    lifecycle(intentRef) {
      const latest = this.latestReceipt(intentRef);
      if (!latest) return "pending";
      return outcomeToLifecycle(latest.status);
    },
  };
}
