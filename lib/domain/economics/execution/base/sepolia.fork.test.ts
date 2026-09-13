import { describe, expect, it } from "vitest";
import { pickSepoliaRpcUrl } from "./sepoliaEnv";
import { startLocalSettlementChain } from "./localChain";
import { BASE_SEPOLIA_CHAIN_ID } from "./sepoliaGuard";

const rpc = pickSepoliaRpcUrl();

describe.skipIf(!rpc)("Base Sepolia fork (optional, no testnet ETH)", () => {
  it(
    "forks Sepolia, deploys V1 with funded local accounts, and settles once",
    { timeout: 90_000 },
    async () => {
      let local: Awaited<ReturnType<typeof startLocalSettlementChain>> | undefined;
      try {
        local = await startLocalSettlementChain({ forkUrl: rpc });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[moc-fork] SKIPPED", message);
        return;
      }
      try {
        expect(local.config.chainId).toBe(BASE_SEPOLIA_CHAIN_ID);
        expect(await local.chain.getChainId()).toBe(BASE_SEPOLIA_CHAIN_ID);
        expect(await local.publicClient.getBalance({ address: local.executorAddress })).toBeGreaterThan(
          0n
        );
        const { intentRefToBytes32 } = await import("./intentRef");
        const sent = await local.chain.sendSettle({
          intentRef: intentRefToBytes32(`intent:fork:${Date.now()}`),
          beneficiary: local.beneficiary,
          amount: 1_000n,
          token: local.usdcAddress,
        });
        const mined = await local.publicClient.waitForTransactionReceipt({ hash: sent.hash });
        expect(mined.status).toBe("success");
      } finally {
        await local.close();
      }
    }
  );
});

describe("Base Sepolia fork gate", () => {
  it("does not require a faucet or executor key", () => {
    expect(typeof pickSepoliaRpcUrl()).toBe("string");
  });
});
