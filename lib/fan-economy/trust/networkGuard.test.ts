import { describe, expect, it } from "vitest";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { configuredTrust } from "@/lib/fan-economy/trust/configured";
import { assertStellarTestnet, assertStellarTestnetRpc } from "@/lib/fan-economy/trust/networkGuard";
import { createSorobanRpcTrust, readSorobanTrustConfig } from "@/lib/fan-economy/trust/rpc";

const ready = {
  MOC_TRUST_EXECUTION: "soroban",
  STELLAR_NETWORK: "testnet",
  STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
  MOC_FAN_ECONOMY_CONTRACT_ID: "CEXAMPLE",
  MOC_MATERIALIZER_PUBLIC_KEY: "GEXAMPLE",
  MOC_MATERIALIZER_SECRET: "must-not-appear",
};

describe("Stellar testnet guard", () => {
  it("fails closed unless the network is testnet", () => {
    expect(() => assertStellarTestnet("testnet")).not.toThrow();
    for (const network of ["public", "mainnet", "pubnet", "futurenet", ""]) {
      expect(() => assertStellarTestnet(network)).toThrow("STELLAR_MAINNET_FORBIDDEN");
    }
    expect(() => assertStellarTestnetRpc("https://soroban-rpc.mainnet.example")).toThrow("STELLAR_MAINNET_FORBIDDEN");
  });

  it("does not call RPC or reveal a secret when configuration is incomplete or unused", async () => {
    expect(() => readSorobanTrustConfig({ STELLAR_NETWORK: "public" })).toThrow("STELLAR_MAINNET_FORBIDDEN");
    expect(() => readSorobanTrustConfig({ STELLAR_NETWORK: "testnet" })).toThrow(FanEconomyError);
    const config = readSorobanTrustConfig(ready);
    expect(JSON.stringify(config)).not.toContain("must-not-appear");
    const adapter = createSorobanRpcTrust(config);
    await expect(adapter.commitReserve({
      campaignId: "campaign",
      authorityActorRef: "moc:actor:a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1",
      asset: "UNIT",
      scale: 0,
      amount: "10",
    })).rejects.toMatchObject({ code: "TRUST_RPC_NOT_READY" });
    expect(configuredTrust({})).toBeNull();
    expect(() => configuredTrust({ MOC_TRUST_EXECUTION: "local" })).toThrow("TRUST_NOT_CONFIGURED");
    expect(() => configuredTrust({ MOC_TRUST_EXECUTION: "soroban", STELLAR_NETWORK: "mainnet" })).toThrow(
      "STELLAR_MAINNET_FORBIDDEN"
    );
  });
});
