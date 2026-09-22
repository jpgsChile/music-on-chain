import { getPrisma } from "@/lib/db";
import { createPrismaEconomicsStore } from "./prismaStore";
import { createPrismaExecutionStore } from "./execution/prismaStore";
import { createPrismaRightsStore } from "./rightsStore";
import { createMockSettlementExecutionAdapter } from "./execution/mockAdapter";
import {
  createBaseSettlementAdapterWithSigner,
  requireBaseSettlementEnv,
  settlementAdapterMode,
  type HostEnv,
  type SettlementAdapterMode,
} from "./execution/base/env";
import { pickExecutorPrivateKey } from "./execution/base/sepoliaEnv";
import type { SettlementExecutionAdapter } from "./execution/types";

const globalStore = globalThis as typeof globalThis & {
  mocSettlementAdapter?: SettlementExecutionAdapter;
  mocSettlementAdapterMode?: SettlementAdapterMode;
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

export function resetSettlementAdapterCache(): void {
  globalStore.mocSettlementAdapter = undefined;
  globalStore.mocSettlementAdapterMode = undefined;
}

/**
 * Explicit mock | base. Default mock.
 * `base` never falls back to mock. Vitest refuses live Base unless MOC_SETTLEMENT_ALLOW_LIVE=1.
 */
export function resolveSettlementAdapter(env: HostEnv = process.env): SettlementExecutionAdapter {
  const mode = settlementAdapterMode(env);
  if (mode === "mock") {
    return createMockSettlementExecutionAdapter();
  }
  if (env === process.env && process.env.VITEST && process.env.MOC_SETTLEMENT_ALLOW_LIVE !== "1") {
    throw new Error("BASE_ADAPTER_FORBIDDEN_IN_UNIT_TESTS");
  }
  const runtime = requireBaseSettlementEnv(env);
  const executorKey = pickExecutorPrivateKey(env);
  if (!executorKey) throw new Error("SIGNER_ERROR");
  return createBaseSettlementAdapterWithSigner({ env: runtime, executorKey });
}

export function getSettlementAdapter(): SettlementExecutionAdapter {
  const mode = settlementAdapterMode();
  if (globalStore.mocSettlementAdapter && globalStore.mocSettlementAdapterMode === mode) {
    return globalStore.mocSettlementAdapter;
  }
  const adapter = resolveSettlementAdapter();
  globalStore.mocSettlementAdapter = adapter;
  globalStore.mocSettlementAdapterMode = mode;
  return adapter;
}
