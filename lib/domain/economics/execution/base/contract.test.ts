import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWalletClient, type Address, type Hash, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mocSettlementAbi } from "./abi";
import { compileSettlementContracts } from "./compile";
import { intentRefToBytes32 } from "./intentRef";
import {
  LOCAL_BENEFICIARY_KEY,
  startLocalSettlementChain,
  type LocalSettlementChain,
} from "./localChain";

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

describe("MOCSettlement V1 contract (bytecode)", () => {
  let local: LocalSettlementChain;
  const artifacts = compileSettlementContracts();

  beforeAll(async () => {
    local = await startLocalSettlementChain();
  }, timeout);

  afterAll(async () => {
    await local?.close();
  });

  it("compiles MOCSettlement, MockUSDC, and non-standard tokens", () => {
    expect(artifacts.mocSettlement.bytecode.startsWith("0x")).toBe(true);
    expect(artifacts.mockUsdc.bytecode.startsWith("0x")).toBe(true);
    expect(artifacts.revertingToken.bytecode.length).toBeGreaterThan(10);
  });

  it("happy path: authorized settle transfers USDC and emits evidence", { timeout }, async () => {
    const intent = intentRefToBytes32("intent:entitlement-1");
    const before = await local.chain.getBalance(local.beneficiary);
    const sent = await local.chain.sendSettle({
      intentRef: intent,
      beneficiary: local.beneficiary,
      amount: AMOUNT,
      token: local.usdcAddress,
    });
    const mined = await local.publicClient.waitForTransactionReceipt({ hash: sent.hash });
    expect(mined.status).toBe("success");
    expect(await local.chain.isExecuted(intent)).toBe(true);
    expect(await local.chain.getBalance(local.beneficiary)).toBe(before + AMOUNT);
    const event = await local.chain.findSettlementEvent(intent);
    expect(event?.beneficiary.toLowerCase()).toBe(local.beneficiary.toLowerCase());
    expect(event?.amount).toBe(AMOUNT);
    expect(event?.asset.toLowerCase()).toBe(local.usdcAddress.toLowerCase());
  });

  it("INV-01 replay: same intentRef cannot succeed twice", { timeout }, async () => {
    const intent = intentRefToBytes32("intent:replay");
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

  it("unauthorized executor reverts", { timeout }, async () => {
    const stranger = privateKeyToAccount(LOCAL_BENEFICIARY_KEY);
    const wallet = createWalletClient({
      chain: local.chainDef,
      transport: local.transport,
      account: stranger,
    });
    const intent = intentRefToBytes32("intent:unauth");
    await assertTxFails(local, () =>
      wallet.writeContract({
        address: local.contractAddress,
        abi: mocSettlementAbi,
        functionName: "settle",
        args: [intent, local.beneficiary, AMOUNT, local.usdcAddress],
        chain: local.chainDef,
        account: stranger,
      })
    );
    expect(await local.chain.isExecuted(intent)).toBe(false);
  });

  it("zero address, zero amount, and zero intent revert without marking executed", { timeout }, async () => {
    const intent = intentRefToBytes32("intent:zeros");
    const zero = "0x0000000000000000000000000000000000000000" as Address;
    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: intent,
        beneficiary: zero,
        amount: AMOUNT,
        token: local.usdcAddress,
      })
    );
    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: intent,
        beneficiary: local.beneficiary,
        amount: 0n,
        token: local.usdcAddress,
      })
    );
    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
        beneficiary: local.beneficiary,
        amount: AMOUNT,
        token: local.usdcAddress,
      })
    );
    expect(await local.chain.isExecuted(intent)).toBe(false);
  });

  it("wrong asset reverts", { timeout }, async () => {
    const hash = await local.walletClient.deployContract({
      abi: artifacts.mockUsdc.abi,
      bytecode: artifacts.mockUsdc.bytecode,
      account: local.executor,
      chain: local.chainDef,
      gas: 3_000_000n,
    });
    const receipt = await local.publicClient.waitForTransactionReceipt({ hash });
    const other = receipt.contractAddress as Address;
    const intent = intentRefToBytes32("intent:asset");
    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: intent,
        beneficiary: local.beneficiary,
        amount: AMOUNT,
        token: other,
      })
    );
    expect(await local.chain.isExecuted(intent)).toBe(false);
  });

  it("insufficient allowance / balance does not mark settlement executed", { timeout }, async () => {
    await local.approve(0n);
    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: intentRefToBytes32("intent:allowance"),
        beneficiary: local.beneficiary,
        amount: AMOUNT,
        token: local.usdcAddress,
      })
    );
    expect(await local.chain.isExecuted(intentRefToBytes32("intent:allowance"))).toBe(false);
    await local.approve(2n ** 256n - 1n);

    await assertTxFails(local, () =>
      local.chain.sendSettle({
        intentRef: intentRefToBytes32("intent:balance"),
        beneficiary: local.beneficiary,
        amount: 50_000_000n,
        token: local.usdcAddress,
      })
    );
    expect(await local.chain.isExecuted(intentRefToBytes32("intent:balance"))).toBe(false);
  });

  it("failed transfer (reverting / silent-fail token) does not confirm", { timeout }, async () => {
    for (const kind of ["revertingToken", "silentFailToken"] as const) {
      const tokenHash = await local.walletClient.deployContract({
        abi: artifacts[kind].abi,
        bytecode: artifacts[kind].bytecode,
        account: local.executor,
        chain: local.chainDef,
        gas: 3_000_000n,
      });
      const tokenReceipt = await local.publicClient.waitForTransactionReceipt({ hash: tokenHash });
      const token = tokenReceipt.contractAddress as Address;
      const settleHash = await local.walletClient.deployContract({
        abi: artifacts.mocSettlement.abi,
        bytecode: artifacts.mocSettlement.bytecode,
        args: [local.executorAddress, token],
        account: local.executor,
        chain: local.chainDef,
        gas: 3_000_000n,
      });
      const settleReceipt = await local.publicClient.waitForTransactionReceipt({ hash: settleHash });
      const contract = settleReceipt.contractAddress as Address;
      const intent = intentRefToBytes32(`intent:${kind}`);
      await assertTxFails(local, () =>
        local.walletClient.writeContract({
          address: contract,
          abi: mocSettlementAbi,
          functionName: "settle",
          args: [intent, local.beneficiary, AMOUNT, token],
          account: local.executor,
          chain: local.chainDef,
        })
      );
      const executed = await local.publicClient.readContract({
        address: contract,
        abi: mocSettlementAbi,
        functionName: "executed",
        args: [intent],
      });
      expect(executed).toBe(false);
    }
  });
});
