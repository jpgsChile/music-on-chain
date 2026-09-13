import { getPrisma } from "@/lib/db";
import { createPrismaEconomicsStore } from "./prismaStore";
import { createPrismaExecutionStore } from "./execution/prismaStore";
import { createPrismaRightsStore } from "./rightsStore";
import { createMockSettlementExecutionAdapter } from "./execution/mockAdapter";
import type { SettlementExecutionAdapter } from "./execution/types";

const globalStore = globalThis as typeof globalThis & {
  mocSettlementAdapter?: SettlementExecutionAdapter;
};

export function getEconomicsStore() {
  return createPrismaEconomicsStore(getPrisma());
}

export function getExecutionStore() {
  return createPrismaExecutionStore(getPrisma());
}

export function getRightsStore() {
  return createPrismaRightsStore(getPrisma());
}

export function getSettlementAdapter(): SettlementExecutionAdapter {
  if (!globalStore.mocSettlementAdapter) {
    globalStore.mocSettlementAdapter = createMockSettlementExecutionAdapter();
  }
  return globalStore.mocSettlementAdapter;
}
