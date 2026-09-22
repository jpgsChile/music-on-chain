import { afterEach, describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { money } from "./money";
import { createExecutionRequest, createSettlementIntent } from "./execution/intent";
import { isBaseSettlementAdapter } from "./execution/sessionSettlement";
import {
  requireBaseSettlementEnv,
  settlementAdapterMode,
} from "./execution/base/env";
import { getSettlementAdapter, resetSettlementAdapterCache, resolveSettlementAdapter } from "./runtime";

const ADDR = {
  contract: "0x2061f8A1f8A76885d606f98313ba72c1A931D61F",
  asset: "0x54aa6b5f077bD75634C2F7390c7df73B2e24BdED",
} as const;

function baseEnv(extra: Record<string, string> = {}) {
  const key = generatePrivateKey();
  const account = privateKeyToAccount(key);
  return {
    MOC_SETTLEMENT_ADAPTER: "base",
    MOC_SETTLEMENT_CHAIN_ID: "84532",
    BASE_SEPOLIA_RPC_URL: "https://example.invalid/sepolia",
    MOC_SETTLEMENT_ADDRESS: ADDR.contract,
    MOC_SETTLEMENT_ASSET: ADDR.asset,
    MOC_SETTLEMENT_EXECUTOR_ADDRESS: account.address,
    BASE_EXECUTOR_PRIVATE_KEY: key,
    ...extra,
  };
}

describe("Studio settlement adapter selection", () => {
  afterEach(() => {
    process.env.MOC_SETTLEMENT_ADAPTER = "mock";
    resetSettlementAdapterCache();
  });

  it("defaults to mock and keeps mock CONFIRMED off-chain", async () => {
    expect(settlementAdapterMode({})).toBe("mock");
    const adapter = resolveSettlementAdapter({ MOC_SETTLEMENT_ADAPTER: "mock" });
    expect(isBaseSettlementAdapter(adapter)).toBe(false);
    const entitlement = {
      entitlementId: "e-1",
      actorRef: "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      revenueId: "r-1",
      distributionId: "d-1",
      shareBps: 10_000,
      amount: money(1n, "USDC"),
      source: { kind: "rule" as const },
      status: "accrued" as const,
      createdAt: "2026-09-13T00:00:00.000Z",
    };
    const result = await adapter.execute(
      createExecutionRequest({
        requestRef: "req:1",
        intent: createSettlementIntent({ intentRef: "intent:1", entitlement, occurredAt: entitlement.createdAt }),
        executionMode: "off-chain",
        occurredAt: entitlement.createdAt,
      })
    );
    expect(result.status).toBe("CONFIRMED");
    expect(result.metadata?.adapter).toBe("mock");
    expect(result.metadata?.simulated).toBe(true);
    expect(result.metadata?.onChain).toBe(false);
  });

  it("selects the Base adapter only when configured, without sending a transaction", () => {
    const adapter = resolveSettlementAdapter(baseEnv());
    expect(isBaseSettlementAdapter(adapter)).toBe(true);
  });

  it("requires chainId 84532 and rejects Base Mainnet", () => {
    expect(() =>
      requireBaseSettlementEnv({
        ...baseEnv({ MOC_SETTLEMENT_CHAIN_ID: "8453" }),
      })
    ).toThrow("MAINNET_FORBIDDEN");
    expect(() =>
      requireBaseSettlementEnv({
        ...baseEnv({ MOC_SETTLEMENT_CHAIN_ID: "1" }),
      })
    ).toThrow("WRONG_CHAIN");
    expect(requireBaseSettlementEnv(baseEnv()).chainId).toBe(84532);
  });

  it("does not fall back to mock when base config is incomplete", () => {
    expect(() =>
      requireBaseSettlementEnv({
        MOC_SETTLEMENT_ADAPTER: "base",
        MOC_SETTLEMENT_CHAIN_ID: "84532",
      })
    ).toThrow("CONFIGURATION_ERROR");
    expect(() => resolveSettlementAdapter({ MOC_SETTLEMENT_ADAPTER: "base" })).toThrow(
      "CONFIGURATION_ERROR"
    );
  });

  it("refuses unknown adapter names", () => {
    expect(() => settlementAdapterMode({ MOC_SETTLEMENT_ADAPTER: "prod" })).toThrow(
      "UNKNOWN_SETTLEMENT_ADAPTER"
    );
  });

  it("keeps getSettlementAdapter on mock during unit tests", () => {
    const adapter = getSettlementAdapter();
    expect(isBaseSettlementAdapter(adapter)).toBe(false);
  });

  it("refuses live Base through process.env during Vitest", () => {
    const previous = process.env.MOC_SETTLEMENT_ADAPTER;
    process.env.MOC_SETTLEMENT_ADAPTER = "base";
    resetSettlementAdapterCache();
    expect(() => getSettlementAdapter()).toThrow("BASE_ADAPTER_FORBIDDEN_IN_UNIT_TESTS");
    if (previous === undefined) delete process.env.MOC_SETTLEMENT_ADAPTER;
    else process.env.MOC_SETTLEMENT_ADAPTER = previous;
    resetSettlementAdapterCache();
  });
});
