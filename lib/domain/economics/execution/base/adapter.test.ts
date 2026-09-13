import type { Address, Hash, Hex } from "viem";
import { describe, expect, it } from "vitest";
import { createActor } from "../../../invariants";
import { money } from "../../money";
import { createExecutionRequest, createSettlementIntent } from "../intent";
import type { ExecutionRequest } from "../types";
import { MOC_SETTLEMENT_VERSION } from "./abi";
import { createBaseSettlementAdapter } from "./adapter";
import { intentRefToBytes32 } from "./intentRef";
import type { BaseChainPort, BaseSettlementConfig, ParsedSettlementEvent } from "./types";

const ACTOR = "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TIME = "2026-09-07T18:00:00.000Z";
const USDC = "0x2222222222222222222222222222222222222222" as Address;
const CONTRACT = "0x1111111111111111111111111111111111111111" as Address;
const EXECUTOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;
const BENEFICIARY = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Address;
const TX = ("0x" + "ab".repeat(32)) as Hash;

const config: BaseSettlementConfig = {
  chainId: 84532,
  contractAddress: CONTRACT,
  usdcAddress: USDC,
  executorAddress: EXECUTOR,
  assetSymbol: "USDC",
  tokenDecimals: 6,
  contractVersion: MOC_SETTLEMENT_VERSION,
  waitForConfirmation: true,
  receiptTimeoutMs: 1_000,
};

function request(): ExecutionRequest {
  const entitlement = {
    entitlementId: "e-1",
    actorRef: ACTOR,
    revenueId: "r-1",
    distributionId: "d-1",
    shareBps: 10_000,
    amount: money(1_000_000n, "USDC"),
    source: { kind: "rule" as const },
    status: "accrued" as const,
    createdAt: TIME,
  };
  return createExecutionRequest({
    requestRef: "req-1",
    intent: createSettlementIntent({ intentRef: "intent-1", entitlement, occurredAt: TIME }),
    destinationCapability: BENEFICIARY,
    executionMode: "on-chain",
    occurredAt: TIME,
  });
}

function event(overrides: Partial<ParsedSettlementEvent> = {}): ParsedSettlementEvent {
  return {
    intentRef: intentRefToBytes32("intent-1"),
    beneficiary: BENEFICIARY,
    asset: USDC,
    amount: 1_000_000n,
    logIndex: 0,
    transactionHash: TX,
    blockNumber: 1n,
    ...overrides,
  };
}

function port(overrides: Partial<BaseChainPort> = {}): BaseChainPort {
  const ev = event();
  return {
    async getChainId() {
      return 84532;
    },
    async getVersion() {
      return MOC_SETTLEMENT_VERSION;
    },
    async getAsset() {
      return USDC;
    },
    async getExecutor() {
      return EXECUTOR;
    },
    async isExecuted() {
      return false;
    },
    async getAllowance() {
      return 10_000_000n;
    },
    async getBalance() {
      return 10_000_000n;
    },
    async sendSettle() {
      return { hash: TX };
    },
    async waitForReceipt() {
      return { status: "success" as const, transactionHash: TX, blockNumber: 1n, to: CONTRACT, logs: [] };
    },
    async findSettlementEvent() {
      return ev;
    },
    readSettlementEvent() {
      return ev;
    },
    ...overrides,
  };
}

const silent = () => undefined;

describe("Base settlement adapter", () => {
  it("success: intent → request → receipt with chain evidence", async () => {
    const adapter = createBaseSettlementAdapter({ config, chain: port(), logger: silent });
    const result = await adapter.execute(request());
    expect(result.status).toBe("CONFIRMED");
    expect(result.externalRef).toBe(TX);
    expect(result.metadata?.chainId).toBe(84532);
    expect(result.metadata?.transactionHash).toBe(TX);
    expect(result.metadata?.adapter).toBe("base");
    expect(result.metadata?.simulated).toBe(false);
    expect(result.metadata?.onChain).toBe(true);
    expect(result.intentRef).toBe("intent-1");
    expect(result.intentRef).not.toBe(TX);
    expect(result.requestRef).toBe("req-1");
  });

  it("preserves requestRef independently of the transaction hash", async () => {
    const adapter = createBaseSettlementAdapter({ config, chain: port(), logger: silent });
    const req = request();
    const result = await adapter.execute(req);
    expect(result.requestRef).toBe(req.requestRef);
    expect(result.requestRef).not.toBe(TX);
    expect(result.requestRef).not.toBe(req.intentRef);
  });

  it("rejects a receipt whose `to` is not the settlement contract", async () => {
    const adapter = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async waitForReceipt() {
          return {
            status: "success",
            transactionHash: TX,
            blockNumber: 1n,
            to: EXECUTOR,
            logs: [],
          };
        },
      }),
    });
    const result = await adapter.execute(request());
    expect(result.status).toBe("FAILED");
    expect(result.metadata?.errorCategory).toBe("WRONG_CONTRACT");
  });

  it("SUBMITTED then reconcile confirms without a new intentRef", async () => {
    const adapter = createBaseSettlementAdapter({
      config: { ...config, waitForConfirmation: false },
      chain: port(),
      logger: silent,
    });
    const req = request();
    const submitted = await adapter.execute(req);
    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.requestRef).toBe(req.requestRef);
    const confirmed = await adapter.reconcile({
      request: req,
      previous: {
        receiptRef: "rcpt-1",
        intentRef: req.intentRef,
        requestRef: req.requestRef,
        executionMode: "on-chain",
        status: "SUBMITTED",
        externalRef: submitted.externalRef,
        occurredAt: TIME,
      },
    });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.intentRef).toBe(req.intentRef);
    expect(confirmed.requestRef).toBe(req.requestRef);
  });

  it("retry of an already executed intent confirms without a second send", async () => {
    let sends = 0;
    const adapter = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async isExecuted() {
          return true;
        },
        async sendSettle() {
          sends += 1;
          return { hash: TX };
        },
      }),
    });
    const first = await adapter.execute(request());
    const second = await adapter.execute(request());
    expect(first.status).toBe("CONFIRMED");
    expect(second.status).toBe("CONFIRMED");
    expect(sends).toBe(0);
  });

  it("failed transaction does not confirm", async () => {
    const adapter = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async waitForReceipt() {
          return { status: "reverted", transactionHash: TX, blockNumber: 1n, logs: [] };
        },
        async isExecuted() {
          return false;
        },
      }),
    });
    expect((await adapter.execute(request())).status).toBe("FAILED");
  });

  it("RPC / wait timeout is UNKNOWN, not FAILED", async () => {
    const adapter = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async waitForReceipt() {
          return null;
        },
      }),
    });
    const result = await adapter.execute(request());
    expect(result.status).toBe("UNKNOWN");
    expect(result.status).not.toBe("FAILED");
    expect(result.externalRef).toBe(TX);
  });

  it("reconcile can confirm a previously unknown submission", async () => {
    const adapter = createBaseSettlementAdapter({ config, chain: port(), logger: silent });
    const req = request();
    const result = await adapter.reconcile({
      request: req,
      previous: {
        receiptRef: "rcpt-1",
        intentRef: req.intentRef,
        requestRef: req.requestRef,
        executionMode: "on-chain",
        status: "UNKNOWN",
        externalRef: TX,
        occurredAt: TIME,
      },
    });
    expect(result.status).toBe("CONFIRMED");
  });

  it("missing event fails confirmation", async () => {
    const adapter = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        readSettlementEvent() {
          return null;
        },
      }),
    });
    const result = await adapter.execute(request());
    expect(result.status).toBe("FAILED");
    expect(result.metadata?.errorCategory).toBe("MISSING_EVENT");
  });

  it("wrong intent / amount / beneficiary on the event cannot confirm", async () => {
    const cases: Array<Partial<ParsedSettlementEvent>> = [
      { intentRef: intentRefToBytes32("other") as Hex },
      { amount: 42n },
      { beneficiary: EXECUTOR },
    ];
    for (const override of cases) {
      const ev = event(override);
      const adapter = createBaseSettlementAdapter({
        config,
        logger: silent,
        chain: port({
          readSettlementEvent() {
            return ev;
          },
        }),
      });
      expect((await adapter.execute(request())).status).toBe("FAILED");
    }
  });

  it("wrong chain or contract version fails before send", async () => {
    let sends = 0;
    const send = async () => {
      sends += 1;
      return { hash: TX };
    };
    const chainWrong = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async getChainId() {
          return 1;
        },
        sendSettle: send,
      }),
    });
    expect((await chainWrong.execute(request())).metadata?.errorCategory).toBe("WRONG_CHAIN");
    const contractWrong = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async getVersion() {
          return "NOPE";
        },
        sendSettle: send,
      }),
    });
    expect((await contractWrong.execute(request())).metadata?.errorCategory).toBe("WRONG_CONTRACT");
    expect(sends).toBe(0);
  });

  it("duplicate execution is idempotent at the adapter (replay)", async () => {
    const adapter = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async isExecuted() {
          return true;
        },
      }),
    });
    expect((await adapter.execute(request())).status).toBe("CONFIRMED");
  });

  it("insufficient allowance / balance fails without sending", async () => {
    let sends = 0;
    const send = async () => {
      sends += 1;
      return { hash: TX };
    };
    const allowance = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async getAllowance() {
          return 1n;
        },
        sendSettle: send,
      }),
    });
    expect((await allowance.execute(request())).metadata?.errorCategory).toBe("INSUFFICIENT_ALLOWANCE");
    const balance = createBaseSettlementAdapter({
      config,
      logger: silent,
      chain: port({
        async getBalance() {
          return 1n;
        },
        sendSettle: send,
      }),
    });
    expect((await balance.execute(request())).metadata?.errorCategory).toBe("INSUFFICIENT_BALANCE");
    expect(sends).toBe(0);
  });

  it("wallet is destination capability, not Actor", async () => {
    const actor = createActor(ACTOR);
    const req = request();
    expect(req.beneficiaryActorRef).toBe(actor.actorRef);
    expect(req.destinationCapability).toBe(BENEFICIARY);
    expect(req.beneficiaryActorRef).not.toBe(req.destinationCapability);
  });

  it("intentRef bytes32 is stable across retries and independent of tx hash", () => {
    const a = intentRefToBytes32("intent-1");
    const b = intentRefToBytes32("intent-1");
    expect(a).toBe(b);
    expect(a).not.toBe(TX);
    expect(a.startsWith("0x")).toBe(true);
    expect(a.length).toBe(66);
  });
});
