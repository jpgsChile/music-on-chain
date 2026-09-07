import { createMemoryEconomicsStore, type EconomicsStore } from "./store";

const globalStore = globalThis as typeof globalThis & {
  mocEconomicsStore?: EconomicsStore;
};

export function getEconomicsStore(): EconomicsStore {
  if (!globalStore.mocEconomicsStore) {
    globalStore.mocEconomicsStore = createMemoryEconomicsStore();
  }
  return globalStore.mocEconomicsStore;
}
