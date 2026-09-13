import { describe, expect, it } from "vitest";
import { isAddress } from "viem";
import {
  BASE_MAINNET_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  SEPOLIA_MIN_EXECUTOR_WEI,
  assertBaseSepoliaChainId,
  gasShortageMessage,
  sepoliaTxUrl,
} from "./sepoliaGuard";
import {
  hasSepoliaLiveCredentials,
  pickSepoliaAssetAddress,
  pickSepoliaContractAddress,
  pickSepoliaRpcUrl,
  previewExecutorSigner,
  readSepoliaLiveCredentials,
} from "./sepoliaEnv";
import { readBaseSettlementEnv } from "./env";

describe("Base Sepolia controlled deployment guards", () => {
  it("accepts only chainId 84532 and forbids mainnet", () => {
    expect(() => assertBaseSepoliaChainId(BASE_SEPOLIA_CHAIN_ID)).not.toThrow();
    expect(() => assertBaseSepoliaChainId(BASE_MAINNET_CHAIN_ID)).toThrow("MAINNET_FORBIDDEN");
    expect(() => assertBaseSepoliaChainId(1)).toThrow("WRONG_CHAIN");
  });

  it("formats GAS_ERROR without exposing a private key", () => {
    expect(gasShortageMessage(0n)).toBe("GAS_ERROR: balance=0 ETH required>=0.003 ETH");
    expect(gasShortageMessage(SEPOLIA_MIN_EXECUTOR_WEI - 1n)).toContain("GAS_ERROR");
    expect(gasShortageMessage(0n)).not.toMatch(/0x[a-fA-F0-9]{64}/);
  });

  it("maps env aliases without requiring the private key", () => {
    const env = {
      BASE_SEPOLIA_RPC_URL: "https://example.invalid/sepolia",
      MOC_SETTLEMENT_ADDRESS: "0x1111111111111111111111111111111111111111",
      MOC_SETTLEMENT_ASSET: "0x2222222222222222222222222222222222222222",
    };
    expect(pickSepoliaRpcUrl(env)).toBe("https://example.invalid/sepolia");
    expect(pickSepoliaContractAddress(env)).toBe("0x1111111111111111111111111111111111111111");
    expect(isAddress(pickSepoliaAssetAddress(env))).toBe(true);
  });

  it("readBaseSettlementEnv reuses Sepolia aliases when adapter=base", () => {
    const parsed = readBaseSettlementEnv({
      MOC_SETTLEMENT_ADAPTER: "base",
      MOC_SETTLEMENT_CHAIN_ID: "84532",
      BASE_SEPOLIA_RPC_URL: "https://example.invalid/sepolia",
      MOC_SETTLEMENT_ADDRESS: "0x1111111111111111111111111111111111111111",
      MOC_SETTLEMENT_ASSET: "0x2222222222222222222222222222222222222222",
      MOC_SETTLEMENT_EXECUTOR_ADDRESS: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(parsed?.rpcUrl).toBe("https://example.invalid/sepolia");
    expect(parsed?.contractAddress).toBe("0x1111111111111111111111111111111111111111");
    expect(parsed?.usdcAddress).toBe("0x2222222222222222222222222222222222222222");
    expect(parsed?.assetSymbol).toBe("USDC");
  });

  it("previewExecutorSigner returns an address and never the key", () => {
    const key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
    const preview = previewExecutorSigner(key);
    expect(preview.network).toBe("base-sepolia");
    expect(preview.chainId).toBe(84532);
    expect(preview.executorAddress.toLowerCase()).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
    expect(JSON.stringify(preview)).not.toContain("ac0974");
  });

  it("hasSepoliaLiveCredentials is false without RPC/signer", () => {
    expect(hasSepoliaLiveCredentials({})).toBe(false);
    expect(() => readSepoliaLiveCredentials({})).toThrow("CONFIGURATION_ERROR");
    expect(() =>
      readSepoliaLiveCredentials({ BASE_SEPOLIA_RPC_URL: "https://example.invalid" })
    ).toThrow("SIGNER_ERROR");
  });

  it("explorer URLs are Base Sepolia, not mainnet", () => {
    expect(sepoliaTxUrl("0x" + "ab".repeat(32))).toContain("sepolia.basescan.org");
    expect(sepoliaTxUrl("0x" + "ab".repeat(32))).not.toContain("://basescan.org/tx");
  });
});
