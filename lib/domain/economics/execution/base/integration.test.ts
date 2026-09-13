import { describe, expect, it } from "vitest";
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
import { createBaseSettlementAdapter } from "./adapter";
import { startLocalSettlementChain } from "./localChain";
import { intentRefToBytes32 } from "./intentRef";

const ACTOR = "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TIME = "2026-09-07T18:30:00.000Z";

describe("Base settlement integration", () => {
  it(
    "Entitlement → Intent → Base adapter → MOCSettlement → MockUSDC → Receipt → domain Settlement",
    { timeout: 30_000 },
    async () => {
    const local = await startLocalSettlementChain();
    try {
      const economics = createMemoryEconomicsStore();
      const execution = createMemoryExecutionStore();
      await recordRevenueOnce(economics, {
        revenueId: "rev-base-1",
        distributionId: "dist-base-1",
        gross: money(1_000_000n, "USDC"),
        policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0, convenienceFeeBps: 0 },
        rule: {
          ruleId: "solo",
          shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }],
        },
        occurredAt: TIME,
      });
      const entitlement = (await economics.listEntitlements(ACTOR))[0];
      const actor = createActor(ACTOR);
      expect(entitlement.actorRef).toBe(actor.actorRef);
      expect(entitlement).not.toHaveProperty("chainId");

      const intent = await openSettlementIntent(economics, execution, {
        entitlementId: entitlement.entitlementId,
        actorRef: ACTOR,
        intentRef: "intent:base-e2e",
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
        intentRef: intent.intentRef,
        actorRef: ACTOR,
        destinationCapability: local.beneficiary,
        executionMode: "on-chain",
        occurredAt: TIME,
      });

      expect(result.receipt.status).toBe("CONFIRMED");
      expect(result.entitlement.status).toBe("settled");
      expect(result.settlement?.actorRef).toBe(ACTOR);
      expect(result.settlement?.settlementId).not.toBe(result.receipt.externalRef);
      expect(result.intent.intentRef).not.toBe(result.receipt.externalRef);
      expect(await local.chain.getBalance(local.beneficiary)).toBe(1_000_000n);
      expect(await local.chain.isExecuted(intentRefToBytes32(intent.intentRef))).toBe(true);

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
      expect(await economics.listEntitlements(ACTOR)).toHaveLength(1);
      expect(await local.chain.getBalance(local.beneficiary)).toBe(1_000_000n);
    } finally {
      await local.close();
    }
  });
});
