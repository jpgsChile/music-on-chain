import type { Address, Hash, Hex } from "viem";
import type {
  ExecutionRequest,
  ExecutionResult,
  SettlementExecutionAdapter,
  SettlementReceipt,
} from "../types";
import { intentRefToBytes32 } from "./intentRef";
import {
  classifySettleRevert,
  logSettlementExecution,
  type BaseChainPort,
  type BaseSettlementConfig,
  type ParsedSettlementEvent,
  type SettlementErrorCategory,
  type SettlementLogEvent,
} from "./types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type Prepared = {
  request: ExecutionRequest;
  intentBytes: Hex;
  beneficiary: Address;
  amount: bigint;
};

export type BaseSettlementAdapter = SettlementExecutionAdapter & {
  readonly kind: "base";
  reconcile(input: { request: ExecutionRequest; previous: SettlementReceipt }): Promise<ExecutionResult>;
};

export function createBaseSettlementAdapter(input: {
  config: BaseSettlementConfig;
  chain: BaseChainPort;
  logger?: (row: SettlementLogEvent) => void;
}): BaseSettlementAdapter {
  const { config, chain, logger } = input;

  async function execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const prepared = await prepare(request);
    if ("result" in prepared) return prepared.result;
    try {
      const existing = await readExisting(prepared);
      if (existing) return existing;
      const funded = await assertFunds(prepared);
      if (funded) return funded;
      const sent = await chain.sendSettle({
        intentRef: prepared.intentBytes,
        beneficiary: prepared.beneficiary,
        amount: prepared.amount,
        token: config.usdcAddress,
      });
      log(request, { status: "SUBMITTED", transactionHash: sent.hash });
      if (config.waitForConfirmation === false) {
        return result(prepared, "SUBMITTED", sent.hash, { phase: "submitted" });
      }
      return waitAndConfirm(prepared, sent.hash);
    } catch (error) {
      return fromError(prepared.request, error);
    }
  }

  async function reconcile(input: {
    request: ExecutionRequest;
    previous: SettlementReceipt;
  }): Promise<ExecutionResult> {
    const preparedOrFail = await prepare(input.request);
    if ("result" in preparedOrFail) return preparedOrFail.result;
    const hash = asTxHash(input.previous.externalRef) ?? asTxHash(input.previous.metadata?.transactionHash);
    try {
      if (hash) return waitAndConfirm(preparedOrFail, hash);
      const existing = await readExisting(preparedOrFail);
      if (existing) return existing;
      const status = input.previous.status === "FAILED" ? "UNKNOWN" : input.previous.status;
      return result(preparedOrFail, status === "ACCEPTED" ? "UNKNOWN" : status, undefined, {
        phase: "reconcile",
      });
    } catch (error) {
      return fromError(input.request, error, { forceUnknown: true, hash });
    }
  }

  async function prepare(
    request: ExecutionRequest
  ): Promise<{ result: ExecutionResult } | Prepared> {
    if (request.executionMode !== "on-chain") {
      return { result: fail(request, "INVALID_REQUEST", "EXECUTION_MODE") };
    }
    if (!request.destinationCapability) {
      return { result: fail(request, "INVALID_REQUEST", "MISSING_DESTINATION") };
    }
    const beneficiary = request.destinationCapability as Address;
    if (beneficiary === ZERO_ADDRESS) {
      return { result: fail(request, "ZERO_ADDRESS") };
    }
    if (request.amount.units <= BigInt(0)) {
      return { result: fail(request, "ZERO_AMOUNT") };
    }
    if (request.amount.asset !== config.assetSymbol || request.amount.scale !== config.tokenDecimals) {
      return { result: fail(request, "WRONG_ASSET") };
    }
    if (request.beneficiaryActorRef.toLowerCase() === beneficiary.toLowerCase()) {
      return { result: fail(request, "INVALID_REQUEST", "WALLET_IS_NOT_ACTOR") };
    }

    try {
      if ((await chain.getChainId()) !== config.chainId) {
        return { result: fail(request, "WRONG_CHAIN") };
      }
      if ((await chain.getVersion()) !== config.contractVersion) {
        return { result: fail(request, "WRONG_CONTRACT") };
      }
      const asset = await chain.getAsset();
      if (asset.toLowerCase() !== config.usdcAddress.toLowerCase()) {
        return { result: fail(request, "WRONG_CONTRACT") };
      }
      const executor = await chain.getExecutor();
      if (executor.toLowerCase() !== config.executorAddress.toLowerCase()) {
        return { result: fail(request, "WRONG_CONTRACT") };
      }
    } catch (error) {
      return { result: fromError(request, error, { forceUnknown: true }) };
    }

    return {
      request,
      intentBytes: intentRefToBytes32(request.intentRef),
      beneficiary,
      amount: request.amount.units,
    };
  }

  async function readExisting(prepared: Prepared): Promise<ExecutionResult | null> {
    if (!(await chain.isExecuted(prepared.intentBytes))) return null;
    const event = await chain.findSettlementEvent(prepared.intentBytes);
    if (!event) {
      return result(prepared, "UNKNOWN", undefined, { errorCategory: "MISSING_EVENT" });
    }
    const mismatch = eventMismatch(prepared, event);
    if (mismatch) return fail(prepared.request, mismatch, undefined, event.transactionHash);
    return confirmed(prepared, event);
  }

  async function assertFunds(prepared: Prepared): Promise<ExecutionResult | null> {
    const allowance = await chain.getAllowance(config.executorAddress, config.contractAddress);
    if (allowance < prepared.amount) return fail(prepared.request, "INSUFFICIENT_ALLOWANCE");
    const balance = await chain.getBalance(config.executorAddress);
    if (balance < prepared.amount) return fail(prepared.request, "INSUFFICIENT_BALANCE");
    return null;
  }

  async function waitAndConfirm(prepared: Prepared, hash: Hash): Promise<ExecutionResult> {
    const receipt = await chain.waitForReceipt(hash, config.receiptTimeoutMs ?? 15_000);
    if (!receipt) {
      log(prepared.request, { status: "UNKNOWN", transactionHash: hash, errorCategory: "RPC_FAILURE" });
      return result(prepared, "UNKNOWN", hash, { errorCategory: "RPC_FAILURE", phase: "wait" });
    }
    if (receipt.status === "reverted") {
      const existing = await readExisting(prepared);
      if (existing?.status === "CONFIRMED") return existing;
      return fail(prepared.request, "TRANSFER_FAILED", undefined, hash);
    }
    if (receipt.to && receipt.to.toLowerCase() !== config.contractAddress.toLowerCase()) {
      return fail(prepared.request, "WRONG_CONTRACT", "RECEIPT_TO_MISMATCH", hash);
    }
    const liveChain = await chain.getChainId();
    if (liveChain !== config.chainId) {
      return fail(prepared.request, "WRONG_CHAIN", undefined, hash);
    }
    const event = chain.readSettlementEvent(receipt);
    if (!event) return fail(prepared.request, "MISSING_EVENT", undefined, hash);
    const mismatch = eventMismatch(prepared, event);
    if (mismatch) return fail(prepared.request, mismatch, undefined, hash);
    return confirmed(prepared, event);
  }

  function eventMismatch(prepared: Prepared, event: ParsedSettlementEvent): SettlementErrorCategory | null {
    if (event.intentRef.toLowerCase() !== prepared.intentBytes.toLowerCase()) return "WRONG_INTENT";
    if (event.beneficiary.toLowerCase() !== prepared.beneficiary.toLowerCase()) return "WRONG_BENEFICIARY";
    if (event.amount !== prepared.amount) return "WRONG_AMOUNT";
    if (event.asset.toLowerCase() !== config.usdcAddress.toLowerCase()) return "WRONG_ASSET";
    return null;
  }

  function confirmed(prepared: Prepared, event: ParsedSettlementEvent): ExecutionResult {
    log(prepared.request, { status: "CONFIRMED", transactionHash: event.transactionHash });
    return {
      status: "CONFIRMED",
      requestRef: prepared.request.requestRef,
      intentRef: prepared.request.intentRef,
      occurredAt: prepared.request.createdAt,
      externalRef: event.transactionHash,
      metadata: {
        adapter: "base",
        onChain: true,
        simulated: false,
        contractVersion: config.contractVersion,
        chainId: config.chainId,
        contractAddress: config.contractAddress,
        usdcAddress: config.usdcAddress,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber.toString(),
        logIndex: event.logIndex,
        asset: event.asset,
        amount: event.amount.toString(),
        beneficiary: event.beneficiary,
        intentRefBytes32: prepared.intentBytes,
        observedAt: new Date().toISOString(),
      },
    };
  }

  function result(
    prepared: Prepared,
    status: ExecutionResult["status"],
    hash: Hash | undefined,
    extra?: Record<string, unknown>
  ): ExecutionResult {
    return {
      status,
      requestRef: prepared.request.requestRef,
      intentRef: prepared.request.intentRef,
      occurredAt: prepared.request.createdAt,
      externalRef: hash,
      metadata: {
        adapter: "base",
        onChain: true,
        simulated: false,
        contractVersion: config.contractVersion,
        chainId: config.chainId,
        contractAddress: config.contractAddress,
        usdcAddress: config.usdcAddress,
        beneficiary: prepared.beneficiary,
        amount: prepared.amount.toString(),
        asset: prepared.request.amount.asset,
        transactionHash: hash,
        intentRefBytes32: prepared.intentBytes,
        ...extra,
      },
    };
  }

  function fail(
    request: ExecutionRequest,
    errorCategory: SettlementErrorCategory,
    detail?: string,
    hash?: Hash
  ): ExecutionResult {
    log(request, { status: "FAILED", errorCategory, transactionHash: hash });
    return {
      status: "FAILED",
      requestRef: request.requestRef,
      intentRef: request.intentRef,
      occurredAt: request.createdAt,
      externalRef: hash,
      metadata: {
        adapter: "base",
        onChain: true,
        simulated: false,
        contractVersion: config.contractVersion,
        chainId: config.chainId,
        contractAddress: config.contractAddress,
        errorCategory,
        detail,
        transactionHash: hash,
      },
    };
  }

  function fromError(
    request: ExecutionRequest,
    error: unknown,
    options?: { forceUnknown?: boolean; hash?: Hash }
  ): ExecutionResult {
    const message = error instanceof Error ? error.message : String(error);
    if (options?.forceUnknown || /rpc|timeout|network|fetch|econn/i.test(message)) {
      log(request, { status: "UNKNOWN", errorCategory: "RPC_FAILURE", transactionHash: options?.hash });
      return {
        status: "UNKNOWN",
        requestRef: request.requestRef,
        intentRef: request.intentRef,
        occurredAt: request.createdAt,
        externalRef: options?.hash,
        metadata: {
          adapter: "base",
          onChain: true,
          simulated: false,
          errorCategory: "RPC_FAILURE",
          transactionHash: options?.hash,
        },
      };
    }
    return fail(request, classifySettleRevert(message), message, options?.hash);
  }

  function log(
    request: Pick<ExecutionRequest, "intentRef" | "requestRef">,
    extra: { status?: string; transactionHash?: string; errorCategory?: SettlementErrorCategory }
  ) {
    logSettlementExecution(
      {
        intentRef: request.intentRef,
        requestRef: request.requestRef,
        chainId: config.chainId,
        contractAddress: config.contractAddress,
        ...extra,
      },
      logger
    );
  }

  return { kind: "base", execute, reconcile };
}

function asTxHash(value: unknown): Hash | undefined {
  if (typeof value !== "string") return undefined;
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) return undefined;
  return value as Hash;
}
