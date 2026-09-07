import { createMemoryEconomicsStore, type EconomicsStore } from "./store";
import { createMemoryExecutionStore, type ExecutionStore } from "./execution/store";
import { createMockSettlementExecutionAdapter } from "./execution/mockAdapter";
import type { SettlementExecutionAdapter } from "./execution/types";

const globalStore = globalThis as typeof globalThis & {
  mocEconomicsStore?: EconomicsStore;
  mocExecutionStore?: ExecutionStore;
  mocSettlementAdapter?: SettlementExecutionAdapter;
};

export function getEconomicsStore(): EconomicsStore {
  if (!globalStore.mocEconomicsStore) {
    globalStore.mocEconomicsStore = createMemoryEconomicsStore();
  }
  return globalStore.mocEconomicsStore;
}

export function getExecutionStore(): ExecutionStore {
  if (!globalStore.mocExecutionStore) {
    globalStore.mocExecutionStore = createMemoryExecutionStore();
  }
  return globalStore.mocExecutionStore;
}

export function getSettlementAdapter(): SettlementExecutionAdapter {
  if (!globalStore.mocSettlementAdapter) {
    globalStore.mocSettlementAdapter = createMockSettlementExecutionAdapter();
  }
  return globalStore.mocSettlementAdapter;
}
