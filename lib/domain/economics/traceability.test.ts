import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { POST as postRevenue } from "@/app/api/economics/revenue/route";
import { persistMusicRelease, resolveOwnedMusicalContext } from "@/lib/domain/releaseRepository";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  createMockSettlementExecutionAdapter,
  createPrismaEconomicsStore,
  executeSettlementIntent,
  isOnChainReceipt,
  isSimulatedMockReceipt,
  money,
  openSettlementIntent,
  recordRevenueOnce,
} from "@/lib/domain/economics";
import { createPrismaExecutionStore } from "@/lib/domain/economics/execution/prismaStore";
import { issueActorSession } from "@/lib/auth/actorSession";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { provisionThenBind } from "@/lib/c-bind/session";
import { closeIsolatedPrisma, openIsolatedPrisma, reopenPrisma } from "@/lib/persistence/testDatabase";
import type { PrismaClient } from "@prisma/client";

const TIME = "2026-09-13T20:00:00.000Z";

async function publishMirrors(actorRef: string) {
  return persistMusicRelease({
    actorRef,
    primaryDisplayName: "Cleaver",
    title: "Mirrors",
    releaseType: "single",
    language: "es",
    primaryGenre: "Rock",
    secondaryGenre: "Metal",
    description: "",
    coverUrl: null,
    soloCreator: true,
    collaborators: [],
    pricingModels: [],
    priceUsdc: 0,
    tokenId: null,
    tracks: [{ title: "mirrors", version: "", durationSec: 203, explicit: false, lyrics: "", previewUrl: null }],
  });
}

describe("Economic traceability and mock settlement semantics", { timeout: 20_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("associates 1 USDC revenue with Work Mirrors and its Release, then traces entitlement and intent", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const actorRef = "moc:actor:cleaver-trace";
    await client.actor.create({ data: { actorRef } });
    const release = await publishMirrors(actorRef);
    expect(release.work.title).toBe("Mirrors");

    const context = await resolveOwnedMusicalContext(actorRef, {
      workId: release.workId,
      releaseId: release.id,
    });
    expect("error" in context).toBe(false);
    if ("error" in context) return;

    const economics = createPrismaEconomicsStore(client);
    const execution = createPrismaExecutionStore(client);
    const assessed = await recordRevenueOnce(economics, {
      revenueId: "rev:mirrors-1usdc",
      distributionId: "dist:mirrors-1usdc",
      gross: money(1_000_000n, "USDC"),
      policy: MOC_PRODUCT_FEE_POLICY_V1,
      rule: { ruleId: "solo-recorder", shares: [{ actorRef, bps: 10_000, source: { kind: "rule" } }] },
      occurredAt: TIME,
      workId: context.workId,
      releaseId: context.releaseId,
    });
    expect(assessed.revenue.workId).toBe(release.workId);
    expect(assessed.revenue.releaseId).toBe(release.id);
    expect(assessed.revenue.workId).not.toBe(actorRef);

    const entitlement = assessed.entitlements[0];
    expect(entitlement.revenueId).toBe("rev:mirrors-1usdc");
    expect(entitlement.actorRef).toBe(actorRef);
    expect(entitlement.actorRef.startsWith("moc:actor:")).toBe(true);
    expect(entitlement.actorRef.startsWith("0x")).toBe(false);

    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef,
      occurredAt: TIME,
    });
    expect(intent.entitlementId).toBe(entitlement.entitlementId);
    expect(intent.intentRef).toBe(`intent:${entitlement.entitlementId}`);

    const settled = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef,
      occurredAt: TIME,
    });
    expect(isSimulatedMockReceipt(settled.receipt)).toBe(true);
    expect(isOnChainReceipt(settled.receipt)).toBe(false);
    expect(settled.receipt.status).toBe("CONFIRMED");
    expect(settled.receipt.executionMode).toBe("off-chain");
    expect(settled.receipt.metadata?.adapter).toBe("mock");
    expect(settled.receipt.metadata?.simulated).toBe(true);
    expect(settled.receipt.metadata?.onChain).toBe(false);
    expect(settled.settlement?.executionLayer).toBe("off-chain");

    const retry = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef,
      occurredAt: TIME,
    });
    expect(retry.intent.intentRef).toBe(intent.intentRef);
    expect(retry.receipt.requestRef).toBe(settled.receipt.requestRef);

    await client.$disconnect();
    client = await reopenPrisma(db.url);
    const economics2 = createPrismaEconomicsStore(client);
    const execution2 = createPrismaExecutionStore(client);
    const loaded = await economics2.getRevenue("rev:mirrors-1usdc");
    expect(loaded?.revenue.workId).toBe(release.workId);
    expect(loaded?.revenue.releaseId).toBe(release.id);
    expect(loaded?.entitlements[0]?.entitlementId).toBe(entitlement.entitlementId);
    expect((await execution2.getIntent(intent.intentRef))?.intentRef).toBe(intent.intentRef);
    expect((await execution2.listRequests(intent.intentRef)).length).toBe(1);
  });

  it("rejects Studio revenue without a musical context and does not invent a Work", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const bound = await provisionThenBind(createPrismaCBindStore(client), {
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:trace-no-context" },
      proof: { sufficient: true },
    });
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const issued = await issueActorSession(
      { actorRef: bound.value.actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:trace-no-context" },
      client
    );
    const res = await postRevenue(
      new NextRequest("http://localhost/api/economics/revenue", {
        method: "POST",
        headers: {
          cookie: `moc_actor_session=${issued.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ grossUnits: "1000000", asset: "USDC", scale: 6 }),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("MUSICAL_CONTEXT_REQUIRED");
  });

  it("posts Studio revenue against an owned Release and persists Work + Release ids", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const bound = await provisionThenBind(createPrismaCBindStore(client), {
      authSubject: { issuer: PRIVY_ISSUER, subject: "did:privy:trace-studio" },
      proof: { sufficient: true },
    });
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const actorRef = bound.value.actorRef;
    const release = await publishMirrors(actorRef);
    const issued = await issueActorSession(
      { actorRef, issuer: PRIVY_ISSUER, subject: "did:privy:trace-studio" },
      client
    );
    const owned = await resolveOwnedMusicalContext(actorRef, {
      workId: release.workId,
      releaseId: release.id,
    });
    expect(owned).toMatchObject({ workId: release.workId, releaseId: release.id });
    const res = await postRevenue(
      new NextRequest("http://localhost/api/economics/revenue", {
        method: "POST",
        headers: {
          cookie: `moc_actor_session=${issued.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          grossUnits: "1000000",
          asset: "USDC",
          scale: 6,
          saleId: "sale:trace-studio",
          workId: release.workId,
          releaseId: release.id,
        }),
      })
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.value.workId).toBe(release.workId);
    expect(data.value.releaseId).toBe(release.id);
    const stored = await createPrismaEconomicsStore(client).getRevenue(data.value.revenueId);
    expect(stored?.revenue.workId).toBe(release.workId);
    expect(stored?.revenue.releaseId).toBe(release.id);
  });
});
