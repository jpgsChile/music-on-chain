import { describe, expect, it } from "vitest";
import { readEvmEnvProfile } from "./evmEnv";
import { BASE_MAINNET_CHAIN_ID, assertNotMainnetChainId } from "./sepoliaGuard";
import { readBaseSettlementEnv } from "./env";

describe("EVM environment profiles", () => {
  it("defaults to local and never selects mainnet", () => {
    expect(readEvmEnvProfile({})).toBe("local");
    expect(readEvmEnvProfile({ EVM_ENV: "fork" })).toBe("fork");
    expect(readEvmEnvProfile({ EVM_ENV: "base-sepolia" })).toBe("base-sepolia");
    expect(() => readEvmEnvProfile({ EVM_ENV: "mainnet" })).toThrow("MAINNET_FORBIDDEN");
    expect(() => readEvmEnvProfile({ EVM_ENV: "8453" })).toThrow("MAINNET_FORBIDDEN");
    expect(() => assertNotMainnetChainId(BASE_MAINNET_CHAIN_ID)).toThrow("MAINNET_FORBIDDEN");
  });

  it("refuses to bind the Base adapter to mainnet", () => {
    expect(() =>
      readBaseSettlementEnv({
        MOC_SETTLEMENT_ADAPTER: "base",
        MOC_SETTLEMENT_CHAIN_ID: "8453",
        BASE_SEPOLIA_RPC_URL: "https://example.invalid",
        MOC_SETTLEMENT_ADDRESS: "0x1111111111111111111111111111111111111111",
        MOC_SETTLEMENT_ASSET: "0x2222222222222222222222222222222222222222",
        MOC_SETTLEMENT_EXECUTOR_ADDRESS: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      })
    ).toThrow("MAINNET_FORBIDDEN");
  });
});
