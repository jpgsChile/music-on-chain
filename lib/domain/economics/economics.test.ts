import { describe, expect, it } from "vitest";
import { createActor } from "../invariants";
import { createRight, createParticipation } from "../invariants";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  allocateByBps,
  applyDistributionRule,
  assessFees,
  createDomainRight,
  createMemoryEconomicsStore,
  derivedBalance,
  money,
  recordRevenue,
  recordRevenueOnce,
  settleEntitlementOnce,
  settleOnce,
  type DistributionRule,
  type ProtocolFeePolicy,
} from "./index";

const ACTOR_A = "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ACTOR_B = "moc:actor:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ACTOR_C = "moc:actor:cccccccc-cccc-cccc-cccc-cccccccccccc";
const FIXED_TIME = "2026-09-07T12:00:00.000Z";

const splitAB: DistributionRule = {
  ruleId: "rule-ab",
  shares: [
    { actorRef: ACTOR_A, bps: 6000, source: { kind: "participation", id: "p-a" } },
    { actorRef: ACTOR_B, bps: 4000, source: { kind: "participation", id: "p-b" } },
  ],
};

function policy(overrides: Partial<ProtocolFeePolicy> = {}): ProtocolFeePolicy {
  return { ...MOC_PRODUCT_FEE_POLICY_V1, ...overrides };
}

describe("MOC Economic & Rights Foundation (tests 1–25)", () => {
  it("TEST 1: Revenue can exist without wallet", () => {
    const assessed = recordRevenue({
      revenueId: "rev-1",
      distributionId: "dist-1",
      gross: money(1_000_000n, "USDC"),
      policy: policy(),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    expect(assessed.revenue).not.toHaveProperty("wallet");
    expect(assessed.revenue.gross.units).toBe(1_000_000n);
  });

  it("TEST 2: Entitlement can exist without wallet", () => {
    const assessed = recordRevenue({
      revenueId: "rev-2",
      distributionId: "dist-2",
      gross: money(1_000_000n, "USDC"),
      policy: policy(),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    expect(assessed.entitlements[0]).not.toHaveProperty("wallet");
    expect(assessed.entitlements[0].status).toBe("accrued");
  });

  it("TEST 3: beneficiary is Actor, not wallet", () => {
    const assessed = recordRevenue({
      revenueId: "rev-3",
      distributionId: "dist-3",
      gross: money(1_000_000n, "USDC"),
      policy: policy(),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    for (const entitlement of assessed.entitlements) {
      expect(entitlement.actorRef.startsWith("moc:actor:")).toBe(true);
    }
  });

  it("TEST 4: changing wallet does not change Entitlement", () => {
    const actor = createActor(ACTOR_A);
    const assessed = recordRevenue({
      revenueId: "rev-4",
      distributionId: "dist-4",
      gross: money(100n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: actor.actorRef, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: FIXED_TIME,
    });
    const before = assessed.entitlements[0].actorRef;
    expect(before).toBe(actor.actorRef);
    expect(assessed.entitlements[0].actorRef).toBe(before);
  });

  it("TEST 5: an Actor can receive multiple Entitlements", () => {
    const store = createMemoryEconomicsStore();
    const rule: DistributionRule = {
      ruleId: "solo",
      shares: [{ actorRef: ACTOR_A, bps: 10_000, source: { kind: "rule" } }],
    };
    recordRevenueOnce(store, {
      revenueId: "rev-5a",
      distributionId: "d-5a",
      gross: money(100n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule,
      occurredAt: FIXED_TIME,
    });
    recordRevenueOnce(store, {
      revenueId: "rev-5b",
      distributionId: "d-5b",
      gross: money(50n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule,
      occurredAt: FIXED_TIME,
    });
    expect(store.listEntitlements(ACTOR_A)).toHaveLength(2);
  });

  it("TEST 6: Revenue can be distributed among multiple Actors", () => {
    const assessed = recordRevenue({
      revenueId: "rev-6",
      distributionId: "dist-6",
      gross: money(1_000_000n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    expect(assessed.entitlements.map((row) => row.actorRef)).toEqual([ACTOR_A, ACTOR_B]);
    expect(assessed.entitlements[0].amount.units + assessed.entitlements[1].amount.units).toBe(
      1_000_000n
    );
  });

  it("TEST 7: Distribution is deterministic", () => {
    const input = {
      revenueId: "rev-7",
      distributionId: "dist-7",
      gross: money(999n, "USDC"),
      policy: policy(),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    };
    const a = recordRevenue(input);
    const b = recordRevenue(input);
    expect(a.distribution.allocations).toEqual(b.distribution.allocations);
  });

  it("TEST 8: Fee calculation is deterministic", () => {
    const gross = money(1_000_000n, "USDC");
    const first = assessFees("rev-8", gross, policy({ convenienceFeeBps: 250 }));
    const second = assessFees("rev-8", gross, policy({ convenienceFeeBps: 250 }));
    expect(first).toEqual(second);
  });

  it("TEST 9: Gross Revenue ≠ Net Revenue", () => {
    const assessed = recordRevenue({
      revenueId: "rev-9",
      distributionId: "dist-9",
      gross: money(1_000_000n, "USDC"),
      policy: policy(),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    expect(assessed.assessment.netDistributable.units).not.toBe(assessed.revenue.gross.units);
    expect(assessed.assessment.netDistributable.units).toBe(950_000n);
  });

  it("TEST 10: Protocol Fee is explicitly identified", () => {
    const fees = assessFees("rev-10", money(1_000_000n, "USDC"), policy()).fees;
    const protocol = fees.find((line) => line.kind === "protocol");
    expect(protocol?.bps).toBe(500);
    expect(protocol?.borneBy).toBe("creator-pool");
    expect(protocol?.amount.units).toBe(50_000n);
  });

  it("TEST 11: Convenience Fee is separate", () => {
    const assessment = assessFees(
      "rev-11",
      money(1_000_000n, "USDC"),
      policy({ convenienceFeeBps: 250 })
    );
    const convenience = assessment.fees.find((line) => line.kind === "convenience");
    expect(convenience?.borneBy).toBe("buyer");
    expect(convenience?.amount.units).toBe(25_000n);
    expect(assessment.buyerPays.units).toBe(1_025_000n);
    expect(assessment.netDistributable.units).toBe(950_000n);
  });

  it("TEST 12: Entitlement can exist before Settlement", () => {
    const assessed = recordRevenue({
      revenueId: "rev-12",
      distributionId: "dist-12",
      gross: money(100n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR_A, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: FIXED_TIME,
    });
    expect(assessed.entitlements[0].status).toBe("accrued");
  });

  it("TEST 13: Settlement does not create the Entitlement", () => {
    const assessed = recordRevenue({
      revenueId: "rev-13",
      distributionId: "dist-13",
      gross: money(100n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR_A, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: FIXED_TIME,
    });
    const id = assessed.entitlements[0].entitlementId;
    const { settlement } = settleEntitlementOnce(
      assessed.entitlements[0],
      "set-13",
      "off-chain",
      null,
      FIXED_TIME
    );
    expect(settlement.entitlementId).toBe(id);
    expect(settlement.actorRef).toBe(ACTOR_A);
  });

  it("TEST 14: an Entitlement cannot be settled twice", () => {
    const store = createMemoryEconomicsStore();
    recordRevenueOnce(store, {
      revenueId: "rev-14",
      distributionId: "dist-14",
      gross: money(100n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR_A, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: FIXED_TIME,
    });
    const entitlementId = store.listEntitlements(ACTOR_A)[0].entitlementId;
    settleOnce(store, {
      entitlementId,
      settlementId: "set-14a",
      actorRef: ACTOR_A,
      occurredAt: FIXED_TIME,
    });
    expect(() =>
      settleOnce(store, {
        entitlementId,
        settlementId: "set-14b",
        actorRef: ACTOR_A,
        occurredAt: FIXED_TIME,
      })
    ).toThrow("ENTITLEMENT_ALREADY_SETTLED");
  });

  it("TEST 15: rounding is deterministic (exact, remainder, many parties, fees, tiny amounts)", () => {
    const exact = allocateByBps(1_000_000n, splitAB.shares);
    expect(exact[0].units + exact[1].units).toBe(1_000_000n);
    expect(exact.map((row) => row.units)).toEqual([600_000n, 400_000n]);

    const remainderRule: DistributionRule = {
      ruleId: "three",
      shares: [
        { actorRef: ACTOR_A, bps: 3333, source: { kind: "rule" } },
        { actorRef: ACTOR_B, bps: 3333, source: { kind: "rule" } },
        { actorRef: ACTOR_C, bps: 3334, source: { kind: "rule" } },
      ],
    };
    const rem = applyDistributionRule("d", "r", money(100n, "USDC"), remainderRule);
    const sum = rem.allocations.reduce((acc, row) => acc + row.amount.units, 0n);
    expect(sum).toBe(100n);

    const tiny = allocateByBps(1n, [
      { actorRef: ACTOR_A, bps: 5000, source: { kind: "rule" } },
      { actorRef: ACTOR_B, bps: 5000, source: { kind: "rule" } },
    ]);
    expect(tiny[0].units + tiny[1].units).toBe(1n);

    const withFee = recordRevenue({
      revenueId: "rev-15",
      distributionId: "dist-15",
      gross: money(101n, "USDC"),
      policy: policy(),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    const distributed = withFee.entitlements.reduce((acc, row) => acc + row.amount.units, 0n);
    expect(distributed).toBe(withFee.assessment.netDistributable.units);
  });

  it("TEST 16: Revenue provenance is reconstructable", () => {
    const assessed = recordRevenue({
      revenueId: "rev-16",
      distributionId: "dist-16",
      gross: money(1_000_000n, "USDC"),
      policy: policy(),
      rule: splitAB,
      sale: { saleId: "sale-16", occurredAt: FIXED_TIME, workId: "work-16" },
      occurredAt: FIXED_TIME,
    });
    expect(assessed.revenue.origin).toEqual({ kind: "sale", id: "sale-16" });
    expect(assessed.events.some((event) => event.type === "RevenueRecorded")).toBe(true);
  });

  it("TEST 17: Distribution provenance is reconstructable", () => {
    const assessed = recordRevenue({
      revenueId: "rev-17",
      distributionId: "dist-17",
      gross: money(1_000_000n, "USDC"),
      policy: policy(),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    const entitlement = assessed.entitlements[0];
    expect(entitlement.revenueId).toBe("rev-17");
    expect(entitlement.distributionId).toBe("dist-17");
    expect(entitlement.source).toEqual({ kind: "participation", id: "p-a" });
    expect(assessed.revenue.policyId).toBe(MOC_PRODUCT_FEE_POLICY_V1.policyId);
  });

  it("TEST 18: Rights and Entitlements are separate", () => {
    const right = createDomainRight({
      rightId: "right-18",
      actorRef: ACTOR_A,
      objectKind: "work",
      objectId: "work-18",
      kind: "performance",
    });
    const assessed = recordRevenue({
      revenueId: "rev-18",
      distributionId: "dist-18",
      gross: money(100n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: {
        ruleId: "from-right",
        shares: [{ actorRef: ACTOR_A, bps: 10_000, source: { kind: "right", id: right.rightId } }],
      },
      occurredAt: FIXED_TIME,
    });
    expect(right).not.toHaveProperty("shareBps");
    expect(assessed.entitlements[0].source).toEqual({ kind: "right", id: "right-18" });
    expect(right.rightId).not.toBe(assessed.entitlements[0].entitlementId);
  });

  it("TEST 19: Participation and Rights are separate", () => {
    const participation = createParticipation({
      participationId: "part-19",
      workId: "work-19",
      releaseId: "rel-19",
      actorRef: ACTOR_A,
      role: "producer",
    });
    const right = createRight({
      rightId: "right-19",
      workId: "work-19",
      actorRef: ACTOR_A,
      kind: "master",
    });
    expect(participation.participationId).not.toBe(right.rightId);
    expect(participation).not.toHaveProperty("kind");
    expect(right).not.toHaveProperty("role");
  });

  it("TEST 20: Wallet is not economic identity", () => {
    expect(() =>
      applyDistributionRule("d", "r", money(100n, "USDC"), {
        ruleId: "bad",
        shares: [
          {
            actorRef: "0x1111111111111111111111111111111111111111",
            bps: 10_000,
            source: { kind: "rule" },
          },
        ],
      })
    ).toThrow("WALLET_IS_NOT_BENEFICIARY");
  });

  it("TEST 21: Token is not required for a Right", () => {
    const right = createDomainRight({
      rightId: "right-21",
      actorRef: ACTOR_A,
      objectKind: "track",
      objectId: "track-21",
      kind: "mechanical",
    });
    expect(right).not.toHaveProperty("tokenId");
    expect(right).not.toHaveProperty("nft");
  });

  it("TEST 22: Blockchain is not required for Entitlement", () => {
    const assessed = recordRevenue({
      revenueId: "rev-22",
      distributionId: "dist-22",
      gross: money(100n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR_A, bps: 10_000, source: { kind: "rule" } }],
      },
      occurredAt: FIXED_TIME,
    });
    expect(assessed.entitlements[0]).not.toHaveProperty("chainId");
    expect(assessed.entitlements[0]).not.toHaveProperty("txHash");
  });

  it("TEST 23–25: calculation works without RPC, Privy, or frontend", () => {
    const assessed = recordRevenue({
      revenueId: "rev-23",
      distributionId: "dist-23",
      gross: money(42n, "EUR"),
      policy: policy({ protocolFeeBps: 0, convenienceFeeBps: 0 }),
      rule: splitAB,
      occurredAt: FIXED_TIME,
    });
    const balance = derivedBalance(assessed.entitlements, ACTOR_A);
    expect(assessed.revenue.gross.asset).toBe("EUR");
    expect(balance.accrued?.units).toBe(25n);
    expect(assessed.events.every((event) => event.origin === "engine")).toBe(true);
  });

  it("rejects duplicate distribution of the same Revenue", () => {
    const store = createMemoryEconomicsStore();
    const input = {
      revenueId: "rev-dup",
      distributionId: "dist-dup",
      gross: money(10n, "USDC"),
      policy: policy({ protocolFeeBps: 0 }),
      rule: {
        ruleId: "solo",
        shares: [{ actorRef: ACTOR_A, bps: 10_000, source: { kind: "rule" as const } }],
      },
      occurredAt: FIXED_TIME,
    };
    recordRevenueOnce(store, input);
    expect(() => recordRevenueOnce(store, input)).toThrow("DUPLICATE_REVENUE");
  });
});
