import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWalletClient, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createActor } from "../../../invariants";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  createMemoryEconomicsStore,
  createMemoryExecutionStore,
  executeSettlementIntent,
  money,
  openSettlementIntent,
  recordRevenueOnce,
} from "../../index";
import { mocSettlementAbi } from "./abi";
import { createBaseSettlementAdapter } from "./adapter";
import { intentRefToBytes32 } from "./intentRef";
import {
  LOCAL_ATTACKER_KEY,
  LOCAL_CHAIN_ID,
  startLocalSettlementChain,
  type LocalSettlementChain,
} from "./localChain";
import { BASE_MAINNET_CHAIN_ID } from "./sepoliaGuard";

const ACTOR = "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TIME = "2026-09-13T12:00:00.000Z";
const AMOUNT = 1_000_000n;
const timeout = 30_000;

async function assertTxFails(
  local: LocalSettlementChain,
  send: () => Promise<{ hash: Hash } | Hash>
): Promise<void> {
  try {
    const result = await send();
    const hash = typeof result === "string" ? result : result.hash;
    const receipt = await local.publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("reverted");
  } catch {
    // eth_call / send simulation rejected the revert — valid.
  }
}

describe("Local EVM matrix (no faucet, no Base Sepolia)", () => {
  let local: LocalSettlementChain;

  beforeAll(async () => {
    local = await startLocalSettlementChain();
  }, timeout);

  afterAll(async () => {
    await local?.close();
  });

  it("EVM-01 deployment has bytecode and version on chainId 31337", async () => {
    expect(local.config.chainId).toBe(LOCAL_CHAIN_ID);
    expect(await local.chain.getChainId()).toBe(LOCAL_CHAIN_ID);
    const code = await local.publicClient.getCode({ address: local.contractAddress });
    expect(code && code !== "0x").toBe(true);
    expect(await local.chain.getVersion()).toBe("MOC-SETTLEMENT-V1");
    expect((await local.chain.getExecutor()).toLowerCase()).toBe(local.executorAddress.toLowerCase());
    expect((await local.chain.getAsset()).toLowerCase()).toBe(local.usdcAddress.toLowerCase());
  });

  it("refuses Base Mainnet as a local chain id", async () => {
    await expect(startLocalSettlementChain({ chainId: BASE_MAINNET_CHAIN_ID })).rejects.toThrow(
      "MAINNET_FORBIDDEN"
    );
  });

  it("EVM-02/03/04/10 authorized settle transfers, emits, and yields a receipt", { timeout }, async () => {
    const intent = intentRefToBytes32("intent:evm-02");
    const before = await local.chain.getBalance(local.beneficiary);
    const sent = await local.chain.sendSettle({
      intentRef: intent,
      beneficiary: local.beneficiary,
      amount: AMOUNT,
      token: local.usdcAddress,
    });
    const mined = await local.publicClient.waitForTransactionReceipt({ hash: sent.hash });
    expect(mined.status).toBe("success");
    expect(mined.transactionHash).toBe(sent.hash);
    expect(await local.chain.getBalance(local.beneficiary)).toBe(before + AMOUNT);
    const event = await local.chain.findSettlementEvent(intent);
    expect(event?.transactionHash).toBe(sent.hash);
    expect(event?.beneficiary.toLowerCase()).toBe(local.beneficiary.toLowerCase());
    expect(event?.amount).toBe(AMOUNT);
    expect(event?.asset.toLowerCase()).toBe(local.usdcAddress.toLowerCase());
    expect(typeof event?.logIndex).toBe("number");
    expect(event?.blockNumber).toBeGreaterThan(0n);
  });

  it("EVM-05 replay of the same intentRef is rejected", { timeout }, async () => {
    const intent = intentRefToBytes32("intent:evm-05");
    const first = await local.chain.sendSettle({
      intentRef: intent,
      beneficiary: local.beneficiary,
      amount: AMOUNT,
      token: local.usdcAddress,
    });
    expect((await local.publicClient.waitForTransactionReceipt({ hash: first.hash })).status).toBe(
      "success"
    );
    const paid = await local.chain.getBalance(local.beneficiary);
    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: intent,
        beneficiary: local.beneficiary,
        amount: AMOUNT,
        token: local.usdcAddress,
      })
    );
    expect(await local.chain.isExecuted(intent)).toBe(true);
    expect(await local.chain.getBalance(local.beneficiary)).toBe(paid);
  });

  it("EVM-06/11 wrong on-chain beneficiary cannot reconcile as CONFIRMED", { timeout }, async () => {
    const intentRef = "intent:evm-06";
    const sent = await local.chain.sendSettle({
      intentRef: intentRefToBytes32(intentRef),
      beneficiary: local.beneficiaryB,
      amount: AMOUNT,
      token: local.usdcAddress,
    });
    const mined = await local.publicClient.waitForTransactionReceipt({ hash: sent.hash });
    expect(mined.status).toBe("success");

    const economics = createMemoryEconomicsStore();
    const execution = createMemoryExecutionStore();
    await recordRevenueOnce(economics, {
      revenueId: "rev-evm-06",
      distributionId: "dist-evm-06",
      gross: money(AMOUNT, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: TIME,
    });
    await openSettlementIntent(economics, execution, {
      entitlementId: (await economics.listEntitlements(ACTOR))[0].entitlementId,
      actorRef: ACTOR,
      intentRef,
      occurredAt: TIME,
    });
    const adapter = createBaseSettlementAdapter({
      config: local.config,
      chain: local.chain,
      logger: () => undefined,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter,
      intentRef,
      actorRef: ACTOR,
      destinationCapability: local.beneficiary,
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    expect(result.receipt.status).not.toBe("CONFIRMED");
    expect(result.receipt.status === "FAILED" || result.receipt.status === "UNKNOWN").toBe(true);
    expect(createActor(ACTOR).actorRef).not.toBe(local.beneficiary);
    expect(createActor(ACTOR).actorRef).not.toBe(result.receipt.externalRef);
  });

  it("EVM-07 wrong asset reverts", { timeout }, async () => {
    const artifacts = (await import("./compile")).compileSettlementContracts();
    const hash = await local.walletClient.deployContract({
      abi: artifacts.mockUsdc.abi,
      bytecode: artifacts.mockUsdc.bytecode,
      account: local.executor,
      chain: local.chainDef,
      gas: 3_000_000n,
    });
    const receipt = await local.publicClient.waitForTransactionReceipt({ hash });
    const other = receipt.contractAddress as Address;
    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: intentRefToBytes32("intent:evm-07"),
        beneficiary: local.beneficiary,
        amount: AMOUNT,
        token: other,
      })
    );
    expect(await local.chain.isExecuted(intentRefToBytes32("intent:evm-07"))).toBe(false);
  });

  it("EVM-08/11 wrong on-chain amount cannot reconcile as CONFIRMED", { timeout }, async () => {
    const intentRef = "intent:evm-08";
    const sent = await local.chain.sendSettle({
      intentRef: intentRefToBytes32(intentRef),
      beneficiary: local.beneficiary,
      amount: AMOUNT / 2n,
      token: local.usdcAddress,
    });
    expect((await local.publicClient.waitForTransactionReceipt({ hash: sent.hash })).status).toBe(
      "success"
    );
    const economics = createMemoryEconomicsStore();
    const execution = createMemoryExecutionStore();
    await recordRevenueOnce(economics, {
      revenueId: "rev-evm-08",
      distributionId: "dist-evm-08",
      gross: money(AMOUNT, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: TIME,
    });
    await openSettlementIntent(economics, execution, {
      entitlementId: (await economics.listEntitlements(ACTOR))[0].entitlementId,
      actorRef: ACTOR,
      intentRef,
      occurredAt: TIME,
    });
    const adapter = createBaseSettlementAdapter({
      config: local.config,
      chain: local.chain,
      logger: () => undefined,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter,
      intentRef,
      actorRef: ACTOR,
      destinationCapability: local.beneficiary,
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    expect(result.receipt.status).not.toBe("CONFIRMED");
  });

  it("EVM-09 unauthorized executor fails", { timeout }, async () => {
    const attacker = privateKeyToAccount(LOCAL_ATTACKER_KEY);
    const wallet = createWalletClient({
      chain: local.chainDef,
      transport: local.transport,
      account: attacker,
    });
    const intent = intentRefToBytes32("intent:evm-09");
    await assertTxFails(local, () =>
      wallet.writeContract({
        address: local.contractAddress,
        abi: mocSettlementAbi,
        functionName: "settle",
        args: [intent, local.beneficiary, AMOUNT, local.usdcAddress],
        chain: local.chainDef,
        account: attacker,
      })
    );
    expect(await local.chain.isExecuted(intent)).toBe(false);
  });

  it("EVM-12 domain retry does not pay twice", { timeout }, async () => {
    const economics = createMemoryEconomicsStore();
    const execution = createMemoryExecutionStore();
    await recordRevenueOnce(economics, {
      revenueId: "rev-evm-12",
      distributionId: "dist-evm-12",
      gross: money(AMOUNT, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: TIME,
    });
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: (await economics.listEntitlements(ACTOR))[0].entitlementId,
      actorRef: ACTOR,
      intentRef: "intent:evm-12",
      occurredAt: TIME,
    });
    const adapter = createBaseSettlementAdapter({
      config: local.config,
      chain: local.chain,
      logger: () => undefined,
    });
    const first = await executeSettlementIntent({
      economics,
      execution,
      adapter,
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      destinationCapability: local.beneficiary,
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    expect(first.receipt.status).toBe("CONFIRMED");
    const paid = await local.chain.getBalance(local.beneficiary);
    const retry = await executeSettlementIntent({
      economics,
      execution,
      adapter,
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      destinationCapability: local.beneficiary,
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    expect(retry.receipt.status).toBe("CONFIRMED");
    expect(retry.intent.intentRef).toBe(intent.intentRef);
    expect(await economics.listEntitlements(ACTOR)).toHaveLength(1);
    expect(await local.chain.getBalance(local.beneficiary)).toBe(paid);
    expect(first.receipt.requestRef).toBe(retry.receipt.requestRef);
  });
});
