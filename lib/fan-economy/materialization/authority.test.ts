import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { readSorobanTrustConfig } from "@/lib/fan-economy/trust/rpc";
import {
  assertContractId,
  classifySorobanMessage,
  createSorobanMaterializationClient,
  keypairFromSecret,
  signerFor,
} from "@/lib/fan-economy/trust/sorobanClient";
import { publicationPresentation } from "@/lib/fan-economy/materialization/presentation";

const validContract = Keypair.random().publicKey().replace(/^G/, "C");

describe("materializer authority and publication gate", () => {
  it("rejects mainnet and a contract id that is not a Soroban contract", () => {
    expect(() => assertContractId("CEXAMPLE")).toThrow(FanEconomyError);
    expect(() =>
      createSorobanMaterializationClient({
        network: "public" as "testnet",
        contractId: "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI",
        rpcUrl: "https://soroban-testnet.stellar.org",
        materializer: Keypair.fromPublicKey("GASACPYNRZL2TRKPLXKVS3PJX7TVRTOCEWTULPRKBAX2YXJYQZU3PEA7"),
      })
    ).toThrow("STELLAR_MAINNET_FORBIDDEN");
    expect(() =>
      createSorobanMaterializationClient({
        contractId: "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI",
        rpcUrl: "https://mainnet.soroban.example",
        materializer: Keypair.fromPublicKey("GASACPYNRZL2TRKPLXKVS3PJX7TVRTOCEWTULPRKBAX2YXJYQZU3PEA7"),
      })
    ).toThrow("STELLAR_MAINNET_FORBIDDEN");
    expect(validContract.startsWith("C")).toBe(true);
  });

  it("does not let the materializer authorize redeem and never returns the secret", () => {
    const materializer = Keypair.random();
    const fan = Keypair.random();
    const secret = materializer.secret();
    expect(signerFor("lock_redemption", { materializer: materializer.publicKey(), capability: fan.publicKey() })).toBe(
      materializer.publicKey()
    );
    expect(signerFor("redeem", { materializer: materializer.publicKey(), capability: fan.publicKey() })).toBe(fan.publicKey());
    expect(() => signerFor("redeem", { materializer: materializer.publicKey(), capability: materializer.publicKey() })).toThrow(
      "MATERIALIZER_CANNOT_AUTHORIZE_REDEEM"
    );
    expect(() =>
      createSorobanMaterializationClient({
        contractId: "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI",
        rpcUrl: "https://soroban-testnet.stellar.org",
        materializer,
        capability: materializer,
      })
    ).toThrow("MATERIALIZER_CANNOT_AUTHORIZE_REDEEM");
    expect(() => keypairFromSecret(secret, fan.publicKey())).toThrow(FanEconomyError);
    try {
      keypairFromSecret(secret, fan.publicKey());
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain(secret);
      expect(String(error)).not.toContain(secret);
    }
    const config = readSorobanTrustConfig({
      STELLAR_NETWORK: "testnet",
      STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
      MOC_FAN_ECONOMY_CONTRACT_ID: "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI",
      MOC_MATERIALIZER_PUBLIC_KEY: materializer.publicKey(),
      MOC_MATERIALIZER_SECRET: secret,
    });
    expect(JSON.stringify(config)).not.toContain(secret);
    const ui = readFileSync("components/fan-economy/SupportMusic.tsx", "utf8");
    const route = readFileSync("app/api/fan-economy/route.ts", "utf8");
    expect(ui).not.toContain("MOC_MATERIALIZER_SECRET");
    expect(ui).not.toContain("@stellar/stellar-sdk");
    expect(ui).not.toContain("NEXT_PUBLIC_MOC_MATERIALIZER");
    expect(route).not.toContain("NEXT_PUBLIC_MOC_MATERIALIZER");
    expect(route).not.toMatch(/console\.(log|info|debug|error)\([^)]*SECRET/);
    expect(classifySorobanMessage("HostError: Error(Contract, #9)")).toBe("PAYLOAD_CONFLICT");
    expect(classifySorobanMessage("Error(Contract, #16)")).toBe("NOT_MATERIALIZER");
  });

  it("cannot present a Stellar publication without confirmed evidence", () => {
    const base = {
      economicRecord: true,
      verification: "verified" as const,
      publicationState: "confirmed" as const,
      contractStatus: "locked" as const,
      network: "testnet",
      contractId: "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI",
      transactionHash: "ab".repeat(32),
      ledger: 10,
    };
    expect(publicationPresentation(base)).toBe("published");
    expect(publicationPresentation({ ...base, transactionHash: null })).not.toBe("published");
    expect(publicationPresentation({ ...base, ledger: null })).not.toBe("published");
    expect(publicationPresentation({ ...base, contractStatus: "committed" })).not.toBe("published");
    expect(publicationPresentation({ ...base, verification: "inconsistent" })).toBe("error");
    expect(publicationPresentation({ ...base, publicationState: "failed", verification: "failed" })).toBe("error");
    expect(publicationPresentation(null)).toBe("pending");
  });
});
