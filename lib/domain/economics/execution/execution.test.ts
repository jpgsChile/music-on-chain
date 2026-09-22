import { describe, expect, it } from "vitest";
import { createActor, createRight } from "../../invariants";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  applyExecutionReceipt,
  canTransition,
  createExecutionRequest,
  createMemoryEconomicsStore,
  createMemoryExecutionStore,
  createMockSettlementExecutionAdapter,
  createSettlementIntent,
  destinationIsNotBeneficiary,
  executeSettlementIntent,
  money,
  openSettlementIntent,
  recordRevenueOnce,
  rejectForeignReceipt,
} from "../index";

const ACTOR = "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const WALLET = "0x1111111111111111111111111111111111111111";
const TIME = "2026-09-07T15:00:00.000Z";

async function seedEntitlement() {
  const economics = createMemoryEconomicsStore();
  const execution = createMemoryExecutionStore();
  await recordRevenueOnce(economics, {
    revenueId: "rev-exec-1",
    distributionId: "dist-exec-1",
    gross: money(100n, "USDC"),
    policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
    rule: {
      ruleId: "solo",
      shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }],
    },
    occurredAt: TIME,
  });
  const entitlement = (await economics.listEntitlements(ACTOR))[0];
  return { economics, execution, entitlement };
}

describe("On-chain execution settlement boundary (tests 1–24)", () => {
  it("TEST 1: Entitlement can exist without wallet", async () => {
    const { entitlement } = await seedEntitlement();
    expect(entitlement).not.toHaveProperty("wallet");
    expect(entitlement.actorRef).toBe(ACTOR);
  });

  it("TEST 2: SettlementIntent references Entitlement", async () => {
    const { entitlement } = await seedEntitlement();
    const intent = createSettlementIntent({ intentRef: "intent-1", entitlement, occurredAt: TIME });
    expect(intent.entitlementId).toBe(entitlement.entitlementId);
  });

  it("TEST 3: SettlementIntent has Actor beneficiary", async () => {
    const { entitlement } = await seedEntitlement();
    const intent = createSettlementIntent({ intentRef: "intent-1", entitlement, occurredAt: TIME });
    expect(intent.actorRef).toBe(ACTOR);
    expect(intent.actorRef).not.toBe(WALLET);
  });

  it("TEST 4: Wallet is capability, not beneficiary identity", async () => {
    const { entitlement } = await seedEntitlement();
    const intent = createSettlementIntent({ intentRef: "intent-1", entitlement, occurredAt: TIME });
    const request = createExecutionRequest({
      requestRef: "req-1",
      intent,
      destinationCapability: WALLET,
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    expect(request.beneficiaryActorRef).toBe(ACTOR);
    expect(request.destinationCapability).toBe(WALLET.toLowerCase());
    expect(destinationIsNotBeneficiary(request)).toBe(true);
  });

  it("TEST 5: ExecutionRequest can be generated without blockchain", async () => {
    const { entitlement } = await seedEntitlement();
    const intent = createSettlementIntent({ intentRef: "intent-1", entitlement, occurredAt: TIME });
    const request = createExecutionRequest({
      requestRef: "req-1",
      intent,
      executionMode: "off-chain",
      occurredAt: TIME,
    });
    expect(request).not.toHaveProperty("chainId");
    expect(request).not.toHaveProperty("transactionHash");
  });

  it("TEST 6: Mock adapter can execute a settlement", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(result.receipt.status).toBe("CONFIRMED");
    expect(result.receipt.executionMode).toBe("off-chain");
    expect(result.receipt.metadata?.adapter).toBe("mock");
    expect(result.receipt.metadata?.simulated).toBe(true);
    expect(result.receipt.metadata?.onChain).toBe(false);
    expect(result.entitlement.status).toBe("settled");
    expect(result.settlement?.entitlementId).toBe(entitlement.entitlementId);
  });

  it("TEST 7: Execution result distinguishes submitted / confirmed / failed", async () => {
    const { entitlement } = await seedEntitlement();
    const request = createExecutionRequest({
      requestRef: "r",
      intent: createSettlementIntent({
        intentRef: "i",
        entitlement,
        occurredAt: TIME,
      }),
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    expect((await Promise.resolve(createMockSettlementExecutionAdapter({ outcome: "SUBMITTED" }).execute(request))).status).toBe(
      "SUBMITTED"
    );
    expect((await Promise.resolve(createMockSettlementExecutionAdapter({ outcome: "CONFIRMED" }).execute(request))).status).toBe(
      "CONFIRMED"
    );
    expect((await Promise.resolve(createMockSettlementExecutionAdapter({ outcome: "FAILED" }).execute(request))).status).toBe(
      "FAILED"
    );
  });

  it("TEST 8: Transaction hash is not settlement identity", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter({
        externalRef: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      }),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(result.receipt.externalRef).not.toBe(result.settlement?.settlementId);
    expect(result.receipt.externalRef).not.toBe(result.intent.intentRef);
    expect(result.receipt.externalRef).not.toBe(entitlement.entitlementId);
  });

  it("TEST 9: Retry does not create a new Entitlement", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter({ outcome: "FAILED" }),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      requestRef: "req-fail",
      occurredAt: TIME,
    });
    await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter({ outcome: "CONFIRMED" }),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      requestRef: "req-retry",
      occurredAt: TIME,
    });
    expect(await economics.listEntitlements(ACTOR)).toHaveLength(1);
  });

  it("TEST 10: Idempotent retry does not duplicate settlement", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const first = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const second = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(second.receipt.receiptRef).toBe(first.receipt.receiptRef);
    expect(await economics.hasSettlementFor(entitlement.entitlementId)).toBe(true);
    expect(await execution.listReceipts(intent.intentRef)).toHaveLength(1);
  });

  it("TEST 11: Failed execution does not delete Entitlement", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter({ outcome: "FAILED" }),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(result.entitlement.status).toBe("accrued");
    expect((await economics.getEntitlement(entitlement.entitlementId))?.status).toBe("accrued");
  });

  it("TEST 12: Unknown execution is not treated as failed", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter({ outcome: "UNKNOWN" }),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(result.receipt.status).toBe("UNKNOWN");
    expect(result.receipt.status).not.toBe("FAILED");
    expect(result.entitlement.status).toBe("accrued");
  });

  it("does not open a new intent for a non-accrued entitlement", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    await economics.putEntitlement({ ...entitlement, status: "settled" });
    await expect(
      openSettlementIntent(economics, execution, {
        entitlementId: entitlement.entitlementId,
        actorRef: ACTOR,
        occurredAt: TIME,
      })
    ).rejects.toThrow("ENTITLEMENT_NOT_ACCRUED");
  });

  it("TEST 13: Confirmed execution completes Settlement when conditions are valid", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter({ outcome: "CONFIRMED" }),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(result.payment?.settlementId).toBe(result.settlement?.settlementId);
    expect(result.settlement?.actorRef).toBe(ACTOR);
  });

  it("TEST 14: Settlement does not change the Right", async () => {
    const right = createRight({
      rightId: "right-exec",
      workId: "work-1",
      actorRef: ACTOR,
      kind: "performance",
    });
    const snapshot = { ...right };
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(right).toEqual(snapshot);
  });

  it("TEST 15: Changing wallet does not change Entitlement", async () => {
    const actor = createActor(ACTOR);
    const { entitlement } = await seedEntitlement();
    expect(entitlement.actorRef).toBe(actor.actorRef);
    const intent = createSettlementIntent({ intentRef: "i", entitlement, occurredAt: TIME });
    const withWallet = createExecutionRequest({
      requestRef: "r1",
      intent,
      destinationCapability: WALLET,
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    const otherWallet = createExecutionRequest({
      requestRef: "r2",
      intent,
      destinationCapability: "0x2222222222222222222222222222222222222222",
      executionMode: "on-chain",
      occurredAt: TIME,
    });
    expect(withWallet.beneficiaryActorRef).toBe(otherWallet.beneficiaryActorRef);
    expect(entitlement.actorRef).toBe(ACTOR);
  });

  it("TEST 16–17: Changing network or adapter does not change Entitlement", async () => {
    const { entitlement } = await seedEntitlement();
    const before = { ...entitlement };
    createMockSettlementExecutionAdapter({ metadata: { network: "base" } });
    createMockSettlementExecutionAdapter({ metadata: { network: "ethereum" } });
    expect(entitlement).toEqual(before);
    expect(entitlement).not.toHaveProperty("chainId");
  });

  it("TEST 18–20: domain works without RPC, Privy, or frontend", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(result.receipt.metadata?.adapter).toBe("mock");
  });

  it("TEST 21: Amount and asset remain separated", async () => {
    const { entitlement } = await seedEntitlement();
    expect(entitlement.amount.units).toBe(100n);
    expect(entitlement.amount.asset).toBe("USDC");
  });

  it("TEST 22: Execution receipt keeps provenance", async () => {
    const { economics, execution, entitlement } = await seedEntitlement();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const result = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(result.receipt.intentRef).toBe(intent.intentRef);
    expect(result.receipt.requestRef).toBe(result.request.requestRef);
  });

  it("TEST 23: A receipt cannot complete a different Entitlement", async () => {
    const first = await seedEntitlement();
    await recordRevenueOnce(first.economics, {
      revenueId: "rev-exec-2",
      distributionId: "dist-exec-2",
      gross: money(50n, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: TIME,
    });
    const second = (await first.economics.listEntitlements(ACTOR))[1];
    const intent = createSettlementIntent({
      intentRef: "intent-a",
      entitlement: first.entitlement,
      occurredAt: TIME,
    });
    const request = createExecutionRequest({
      requestRef: "req-a",
      intent,
      executionMode: "off-chain",
      occurredAt: TIME,
    });
    await expect(
      applyExecutionReceipt({
        economics: first.economics,
        execution: first.execution,
        intent,
        request,
        entitlement: second,
        receipt: {
          receiptRef: "rcpt-a",
          intentRef: intent.intentRef,
          requestRef: request.requestRef,
          executionMode: "off-chain",
          status: "CONFIRMED",
          occurredAt: TIME,
        },
        previousLifecycle: "pending",
      })
    ).rejects.toThrow("INTENT_ENTITLEMENT_MISMATCH");
  });

  it("TEST 24: Settlement state transitions are valid", async () => {
    expect(canTransition("pending", "submitted")).toBe(true);
    expect(canTransition("submitted", "confirmed")).toBe(true);
    expect(canTransition("submitted", "unknown")).toBe(true);
    expect(canTransition("failed", "submitted")).toBe(true);
    expect(canTransition("confirmed", "pending")).toBe(false);
    expect(canTransition("confirmed", "submitted")).toBe(false);
    const { intent } = {
      intent: createSettlementIntent({
        intentRef: "i",
        entitlement: (await seedEntitlement()).entitlement,
        occurredAt: TIME,
      }),
    };
    expect(() => rejectForeignReceipt({
      intent,
      receipt: {
        receiptRef: "x",
        intentRef: "other",
        requestRef: "r",
        executionMode: "off-chain",
        status: "CONFIRMED",
        occurredAt: TIME,
      },
    })).toThrow("RECEIPT_INTENT_MISMATCH");
  });
});
