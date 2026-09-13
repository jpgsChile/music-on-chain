import type {
  ExecutionLifecycle,
  ExecutionRequest,
  SettlementIntent,
  SettlementReceipt,
} from "./types";
import { outcomeToLifecycle } from "./transitions";

export type ExecutionStore = {
  getIntent(intentRef: string): Promise<SettlementIntent | null>;
  getIntentByEntitlement(entitlementId: string): Promise<SettlementIntent | null>;
  putIntent(intent: SettlementIntent): Promise<void>;
  getRequest(requestRef: string): Promise<ExecutionRequest | null>;
  listRequests(intentRef: string): Promise<ExecutionRequest[]>;
  putRequest(request: ExecutionRequest): Promise<void>;
  latestReceipt(intentRef: string): Promise<SettlementReceipt | null>;
  listReceipts(intentRef: string): Promise<SettlementReceipt[]>;
  putReceipt(receipt: SettlementReceipt): Promise<void>;
  lifecycle(intentRef: string): Promise<ExecutionLifecycle>;
};

export function createMemoryExecutionStore(): ExecutionStore {
  const intents = new Map<string, SettlementIntent>();
  const byEntitlement = new Map<string, string>();
  const requests = new Map<string, ExecutionRequest>();
  const receipts: SettlementReceipt[] = [];

  return {
    async getIntent(intentRef) {
      return intents.get(intentRef) ?? null;
    },
    async getIntentByEntitlement(entitlementId) {
      const ref = byEntitlement.get(entitlementId);
      return ref ? intents.get(ref) ?? null : null;
    },
    async putIntent(intent) {
      intents.set(intent.intentRef, intent);
      byEntitlement.set(intent.entitlementId, intent.intentRef);
    },
    async getRequest(requestRef) {
      return requests.get(requestRef) ?? null;
    },
    async listRequests(intentRef) {
      return [...requests.values()].filter((row) => row.intentRef === intentRef);
    },
    async putRequest(request) {
      requests.set(request.requestRef, request);
    },
    async latestReceipt(intentRef) {
      const list = receipts.filter((row) => row.intentRef === intentRef);
      return list[list.length - 1] ?? null;
    },
    async listReceipts(intentRef) {
      return receipts.filter((row) => row.intentRef === intentRef);
    },
    async putReceipt(receipt) {
      receipts.push(receipt);
    },
    async lifecycle(intentRef) {
      const latest = await this.latestReceipt(intentRef);
      if (!latest) return "pending";
      return outcomeToLifecycle(latest.status);
    },
  };
}
