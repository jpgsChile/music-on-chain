import type { Address, Hash, Hex } from "viem";

export type SettlementErrorCategory =
  | "UNAUTHORIZED"
  | "REPLAY"
  | "ZERO_ADDRESS"
  | "ZERO_AMOUNT"
  | "WRONG_ASSET"
  | "WRONG_BENEFICIARY"
  | "WRONG_AMOUNT"
  | "WRONG_INTENT"
  | "WRONG_CONTRACT"
  | "WRONG_CHAIN"
  | "INSUFFICIENT_ALLOWANCE"
  | "INSUFFICIENT_BALANCE"
  | "TRANSFER_FAILED"
  | "MISSING_EVENT"
  | "EVENT_MISMATCH"
  | "RPC_FAILURE"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export type ParsedSettlementEvent = {
  intentRef: Hex;
  beneficiary: Address;
  asset: Address;
  amount: bigint;
  logIndex: number;
  transactionHash: Hash;
  blockNumber: bigint;
};

export type OnchainTxReceipt = {
  status: "success" | "reverted";
  transactionHash: Hash;
  blockNumber: bigint;
  to?: Address | null;
  logs: Array<{
    address: Address;
    data: Hex;
    topics: [Hex, ...Hex[]] | [];
    logIndex: number;
  }>;
};

export type BaseSettlementConfig = {
  chainId: number;
  contractAddress: Address;
  usdcAddress: Address;
  executorAddress: Address;
  assetSymbol: string;
  tokenDecimals: number;
  contractVersion: string;
  waitForConfirmation?: boolean;
  receiptTimeoutMs?: number;
};

export type BaseChainPort = {
  getChainId(): Promise<number>;
  getVersion(): Promise<string>;
  getAsset(): Promise<Address>;
  getExecutor(): Promise<Address>;
  isExecuted(intentRef: Hex): Promise<boolean>;
  getAllowance(owner: Address, spender: Address): Promise<bigint>;
  getBalance(owner: Address): Promise<bigint>;
  sendSettle(input: {
    intentRef: Hex;
    beneficiary: Address;
    amount: bigint;
    token: Address;
  }): Promise<{ hash: Hash }>;
  waitForReceipt(hash: Hash, timeoutMs: number): Promise<OnchainTxReceipt | null>;
  findSettlementEvent(intentRef: Hex): Promise<ParsedSettlementEvent | null>;
  readSettlementEvent(receipt: OnchainTxReceipt): ParsedSettlementEvent | null;
};

export type SettlementLogEvent = {
  intentRef: string;
  requestRef?: string;
  attempt?: number;
  chainId?: number;
  contractAddress?: string;
  transactionHash?: string;
  status?: string;
  errorCategory?: SettlementErrorCategory | string;
};

export function logSettlementExecution(
  event: SettlementLogEvent,
  logger?: (row: SettlementLogEvent) => void
): void {
  if (logger) {
    logger(event);
    return;
  }
  if (process.env.MOC_SETTLEMENT_LOG === "0") return;
  console.info("[moc-settlement]", JSON.stringify(event));
}

export function classifySettleRevert(message: string): SettlementErrorCategory {
  const text = message.toLowerCase();
  if (text.includes("unauthorized")) return "UNAUTHORIZED";
  if (text.includes("alreadyexecuted") || text.includes("replay")) return "REPLAY";
  if (text.includes("zerobeneficiary") || text.includes("zeroexecutor")) return "ZERO_ADDRESS";
  if (text.includes("zeroamount")) return "ZERO_AMOUNT";
  if (text.includes("wrongasset")) return "WRONG_ASSET";
  if (text.includes("invalidintent")) return "WRONG_INTENT";
  if (text.includes("allowance")) return "INSUFFICIENT_ALLOWANCE";
  if (text.includes("balance")) return "INSUFFICIENT_BALANCE";
  if (text.includes("transferfailed")) return "TRANSFER_FAILED";
  return "UNKNOWN";
}
