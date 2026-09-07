import {
  decodeEventLog,
  type Account,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { mocSettlementAbi, mockUsdcAbi } from "./abi";
import type { BaseChainPort, OnchainTxReceipt, ParsedSettlementEvent } from "./types";

export function createViemBaseChainPort(input: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  contractAddress: Address;
  usdcAddress: Address;
  account: Account | Address;
}): BaseChainPort {
  const { publicClient, walletClient, contractAddress, usdcAddress, account } = input;

  return {
    async getChainId() {
      return publicClient.getChainId();
    },
    async getVersion() {
      return publicClient.readContract({
        address: contractAddress,
        abi: mocSettlementAbi,
        functionName: "VERSION",
      });
    },
    async getAsset() {
      return publicClient.readContract({
        address: contractAddress,
        abi: mocSettlementAbi,
        functionName: "asset",
      });
    },
    async getExecutor() {
      return publicClient.readContract({
        address: contractAddress,
        abi: mocSettlementAbi,
        functionName: "executor",
      });
    },
    async isExecuted(intentRef) {
      return publicClient.readContract({
        address: contractAddress,
        abi: mocSettlementAbi,
        functionName: "executed",
        args: [intentRef],
      });
    },
    async getAllowance(owner, spender) {
      return publicClient.readContract({
        address: usdcAddress,
        abi: mockUsdcAbi,
        functionName: "allowance",
        args: [owner, spender],
      });
    },
    async getBalance(owner) {
      return publicClient.readContract({
        address: usdcAddress,
        abi: mockUsdcAbi,
        functionName: "balanceOf",
        args: [owner],
      });
    },
    async sendSettle(args) {
      const signer = walletClient.account ?? account;
      // Explicit gas avoids under-estimated eth_estimateGas (Ganache and some RPCs).
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: mocSettlementAbi,
        functionName: "settle",
        args: [args.intentRef, args.beneficiary, args.amount, args.token],
        account: signer,
        chain: walletClient.chain,
        gas: 500_000n,
      });
      return { hash };
    },
    async waitForReceipt(hash, timeoutMs) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: Math.max(1, timeoutMs),
        });
        return toOnchainReceipt(receipt);
      } catch {
        return null;
      }
    },
    async findSettlementEvent(intentRef) {
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: settlementExecutedEvent,
        args: { intentRef },
        fromBlock: 0n,
      });
      const last = logs[logs.length - 1];
      if (!last || last.transactionHash == null || last.blockNumber == null) return null;
      return {
        intentRef: last.args.intentRef as Hex,
        beneficiary: last.args.beneficiary as Address,
        asset: last.args.asset as Address,
        amount: last.args.amount as bigint,
        logIndex: Number(last.logIndex ?? 0),
        transactionHash: last.transactionHash,
        blockNumber: last.blockNumber,
      };
    },
    readSettlementEvent(receipt) {
      return parseSettlementEventFromReceipt(receipt, contractAddress);
    },
  };
}

const settlementExecutedEvent = mocSettlementAbi.find(
  (item) => item.type === "event" && item.name === "SettlementExecuted"
) as Extract<(typeof mocSettlementAbi)[number], { type: "event"; name: "SettlementExecuted" }>;

export function parseSettlementEventFromReceipt(
  receipt: OnchainTxReceipt,
  contractAddress: Address
): ParsedSettlementEvent | null {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    if (log.topics.length === 0) continue;
    try {
      const parsed = decodeEventLog({
        abi: mocSettlementAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (parsed.eventName !== "SettlementExecuted") continue;
      const args = parsed.args as {
        intentRef: Hex;
        beneficiary: Address;
        asset: Address;
        amount: bigint;
      };
      return {
        intentRef: args.intentRef,
        beneficiary: args.beneficiary,
        asset: args.asset,
        amount: args.amount,
        logIndex: log.logIndex,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function toOnchainReceipt(receipt: {
  status: "success" | "reverted";
  transactionHash: Hash;
  blockNumber: bigint;
  to?: Address | null;
  logs: Array<{ address: Address; data: Hex; topics: Hex[]; logIndex: number | null }>;
}): OnchainTxReceipt {
  return {
    status: receipt.status,
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    to: receipt.to ?? null,
    logs: receipt.logs.map((log) => ({
      address: log.address,
      data: log.data,
      topics: (log.topics.length > 0 ? log.topics : []) as OnchainTxReceipt["logs"][number]["topics"],
      logIndex: Number(log.logIndex ?? 0),
    })),
  };
}
