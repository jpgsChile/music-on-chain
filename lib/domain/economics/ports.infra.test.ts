import { describe, expect, it } from "vitest";
import { createActor } from "@/lib/domain/invariants";
import { money, recordRevenue, createMemoryEconomicsStore, createPrismaEconomicsStore, type EconomicsStore } from "@/lib/domain/economics";

describe("Infrastructure substitution does not change domain", () => {
  it("ECON-01 EconomicsStore is the persistence port, not Prisma models", () => {
    const memory: EconomicsStore = createMemoryEconomicsStore();
    expect(typeof memory.putAssessed).toBe("function");
    expect(typeof createPrismaEconomicsStore).toBe("function");
  });

  it("SQLite to PostgreSQL does not require changing Actor or Revenue types", () => {
    const actor = createActor("moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const assessed = recordRevenue({
      revenueId: "rev-port",
      distributionId: "dist-port",
      gross: money(10n, "USDC"),
      policy: { policyId: "p", version: 1, protocolFeeBps: 0, convenienceFeeBps: 0 },
      rule: { ruleId: "solo", shares: [{ actorRef: actor.actorRef, bps: 10_000, source: { kind: "rule" } }] },
    });
    expect(assessed.revenue.revenueId).toBe("rev-port");
    expect(actor.actorRef).not.toMatch(/^0x/);
  });

  it("Privy is not Actor identity", () => {
    const actor = createActor("moc:actor:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(actor.actorRef).not.toBe("did:privy:abc");
  });
});
