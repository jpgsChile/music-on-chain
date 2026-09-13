import { afterEach, describe, expect, it } from "vitest";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  createMockSettlementExecutionAdapter,
  createPrismaEconomicsStore,
  createPrismaRightsStore,
  executeSettlementIntent,
  money,
  openSettlementIntent,
  recordRevenueOnce,
} from "@/lib/domain/economics";
import { createPrismaExecutionStore } from "@/lib/domain/economics/execution/prismaStore";
import { closeIsolatedPrisma, openIsolatedPrisma, reopenPrisma } from "@/lib/persistence/testDatabase";
import type { PrismaClient } from "@prisma/client";

const ACTOR = "moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TIME = "2026-09-13T15:00:00.000Z";

describe("Persistent economic ledger", { timeout: 20_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;
  let url: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("PERSIST-01 revenue fees distribution and entitlements persist atomically", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const store = createPrismaEconomicsStore(client);
    await recordRevenueOnce(store, {
      revenueId: "rev-persist-01",
      distributionId: "dist-persist-01",
      gross: money(1_000_000n, "USDC"),
      policy: MOC_PRODUCT_FEE_POLICY_V1,
      rule: {
        ruleId: "duo",
        shares: [
          { actorRef: ACTOR, bps: 7_000, source: { kind: "participation", id: "p1" } },
          { actorRef: "moc:actor:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", bps: 3_000, source: { kind: "participation", id: "p2" } },
        ],
      },
      occurredAt: TIME,
    });
    const loaded = await store.getRevenue("rev-persist-01");
    expect(loaded?.entitlements).toHaveLength(2);
    expect(loaded?.assessment.fees.some((line) => line.kind === "protocol")).toBe(true);
    expect(loaded?.distribution.allocations).toHaveLength(2);
    expect(await store.listEntitlements(ACTOR)).toHaveLength(1);
  });

  it("PERSIST-02 duplicate revenue id is rejected after restart", async () => {
    const db = await openIsolatedPrisma();
    url = db.url;
    file = db.file;
    client = db.client;
    const store = createPrismaEconomicsStore(client);
    await recordRevenueOnce(store, {
      revenueId: "rev-persist-02",
      distributionId: "dist-persist-02",
      gross: money(100n, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0 },
      rule: { ruleId: "solo", shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }] },
      occurredAt: TIME,
    });
    await client.$disconnect();
    client = await reopenPrisma(url);
    const again = createPrismaEconomicsStore(client);
    await expect(
      recordRevenueOnce(again, {
        revenueId: "rev-persist-02",
        distributionId: "dist-other",
        gross: money(100n, "USDC"),
        policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0 },
        rule: { ruleId: "solo", shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }] },
        occurredAt: TIME,
      })
    ).rejects.toThrow("DUPLICATE_REVENUE");
  });

  it("PERSIST-03 intentRef survives process restart and retry is not a new settlement", async () => {
    const db = await openIsolatedPrisma();
    url = db.url;
    file = db.file;
    client = db.client;
    const economics = createPrismaEconomicsStore(client);
    const execution = createPrismaExecutionStore(client);
    await recordRevenueOnce(economics, {
      revenueId: "rev-persist-03",
      distributionId: "dist-persist-03",
      gross: money(100n, "USDC"),
      policy: { ...MOC_PRODUCT_FEE_POLICY_V1, protocolFeeBps: 0 },
      rule: { ruleId: "solo", shares: [{ actorRef: ACTOR, bps: 10_000, source: { kind: "rule" } }] },
      occurredAt: TIME,
    });
    const entitlement = (await economics.listEntitlements(ACTOR))[0];
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      intentRef: "intent:persist-03",
      occurredAt: TIME,
    });
    await client.$disconnect();
    client = await reopenPrisma(url);
    const economics2 = createPrismaEconomicsStore(client);
    const execution2 = createPrismaExecutionStore(client);
    const reopened = await openSettlementIntent(economics2, execution2, {
      entitlementId: entitlement.entitlementId,
      actorRef: ACTOR,
      intentRef: "intent:should-not-replace",
      occurredAt: TIME,
    });
    expect(reopened.intentRef).toBe(intent.intentRef);
    const first = await executeSettlementIntent({
      economics: economics2,
      execution: execution2,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: reopened.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    const retry = await executeSettlementIntent({
      economics: economics2,
      execution: execution2,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: reopened.intentRef,
      actorRef: ACTOR,
      occurredAt: TIME,
    });
    expect(first.settlement?.settlementId).toBeDefined();
    expect(retry.receipt.requestRef).toBe(first.receipt.requestRef);
    expect(await economics2.listEntitlements(ACTOR)).toHaveLength(1);
    expect(first.settlement?.settlementId).not.toBe(first.receipt.externalRef);
  });

  it("PERSIST-04 domain rights persist without tokens", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const rights = createPrismaRightsStore(client);
    await rights.putRight({
      rightId: "right:work:1",
      actorRef: ACTOR,
      objectKind: "work",
      objectId: "work-1",
      kind: "master",
    });
    await client.$disconnect();
    client = await reopenPrisma(db.url);
    const loaded = await createPrismaRightsStore(client).getRight("right:work:1");
    expect(loaded?.actorRef).toBe(ACTOR);
    expect(loaded).not.toHaveProperty("tokenId");
  });
});
