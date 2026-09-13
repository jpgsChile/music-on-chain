import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { POST as postAccept } from "@/app/api/participations/accept/route";
import { POST as postInvite } from "@/app/api/participations/invite/route";
import { GET as getParticipations } from "@/app/api/participations/route";
import { GET as getEntitlements } from "@/app/api/economics/entitlements/route";
import { POST as postRevenue } from "@/app/api/economics/revenue/route";
import { GET as getReleases } from "@/app/api/releases/route";
import { persistMusicRelease } from "@/lib/domain/releaseRepository";
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
import { buildDemoRoyaltyEngine } from "@/lib/royalty-engine/demoData";
import type { PrismaClient } from "@prisma/client";

const PROOF = { sufficient: true as const };

async function bindPrivy(client: PrismaClient, subject: string) {
  const result = await provisionThenBind(createPrismaCBindStore(client), {
    authSubject: { issuer: PRIVY_ISSUER, subject },
    proof: PROOF,
  });
  if (!result.ok) throw new Error("BIND_FAILED");
  return result.value.actorRef;
}

async function cookieFor(client: PrismaClient, actorRef: string, subject: string) {
  const issued = await issueActorSession({ actorRef, issuer: PRIVY_ISSUER, subject }, client);
  return `moc_actor_session=${issued.token}`;
}

describe("Real economic Studio surface", { timeout: 20_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("owner sees Vengeance 80/20 ledger from Prisma, never demo names, mock never on-chain", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const ownerSubject = "did:privy:surface-owner";
    const carlosSubject = "did:privy:surface-carlos";
    const pabloSubject = "did:privy:surface-pablo";
    const owner = await bindPrivy(client, ownerSubject);
    const carlos = await bindPrivy(client, carlosSubject);
    const pablo = await bindPrivy(client, pabloSubject);
    const release = await persistMusicRelease({
      actorRef: owner,
      primaryDisplayName: "Cleaver",
      title: "Vengeance",
      releaseType: "single",
      language: "es",
      primaryGenre: "Rock",
      secondaryGenre: "Metal",
      description: "",
      coverUrl: null,
      soloCreator: false,
      collaborators: [
        { id: "c", name: "Carlos Concha", email: "c@example.test", role: "author", percentage: 80, actorRef: null },
        { id: "p", name: "Pablo Guzman", email: "p@example.test", role: "composer", percentage: 20, actorRef: null },
      ],
      pricingModels: [],
      priceUsdc: 0,
      tokenId: null,
      tracks: [{ title: "VENGEANCE", version: "", durationSec: 1, explicit: false, lyrics: "", previewUrl: null }],
    });
    const ownerCookie = await cookieFor(client, owner, ownerSubject);
    const carlosCookie = await cookieFor(client, carlos, carlosSubject);
    const pabloCookie = await cookieFor(client, pablo, pabloSubject);

    for (const participation of release.participations) {
      const invited = await postInvite(
        new NextRequest("http://localhost/api/participations/invite", {
          method: "POST",
          headers: { cookie: ownerCookie, "content-type": "application/json" },
          body: JSON.stringify({ participationId: participation.id }),
        })
      );
      const path = (await invited.json()).value.path as string;
      const token = new URL(path, "http://localhost").searchParams.get("token");
      const cookie = participation.displayName === "Carlos Concha" ? carlosCookie : pabloCookie;
      await postAccept(
        new NextRequest("http://localhost/api/participations/accept", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ token }),
        })
      );
    }

    await recordRevenueOnce(createPrismaEconomicsStore(client), {
      revenueId: "rev:unlinked-historic",
      distributionId: "dist:unlinked-historic",
      gross: money(1_000_000n, "USDC"),
      policy: MOC_PRODUCT_FEE_POLICY_V1,
      rule: { ruleId: "solo-recorder", shares: [{ actorRef: owner, bps: 10_000, source: { kind: "rule" } }] },
      occurredAt: "2026-09-13T12:00:00.000Z",
    });

    const posted = await postRevenue(
      new NextRequest("http://localhost/api/economics/revenue", {
        method: "POST",
        headers: { cookie: ownerCookie, "content-type": "application/json" },
        body: JSON.stringify({
          grossUnits: "1000000",
          asset: "USDC",
          scale: 6,
          workId: release.workId,
          releaseId: release.id,
        }),
      })
    );
    expect(posted.status).toBe(200);

    const listed = await getParticipations(
      new NextRequest("http://localhost/api/participations", { headers: { cookie: ownerCookie } })
    );
    const parts = (await listed.json()).value as { displayName: string; revenueSharePercent: number }[];
    expect(parts.map((row) => `${row.displayName}:${row.revenueSharePercent}`).sort()).toEqual([
      "Carlos Concha:80",
      "Pablo Guzman:20",
    ]);

    const catalog = await getReleases(new NextRequest("http://localhost/api/releases", { headers: { cookie: ownerCookie } }));
    const catalogJson = await catalog.json();
    expect(JSON.stringify(catalogJson)).not.toContain("Maya Ruiz");

    const asOwner = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, {
        headers: { cookie: ownerCookie },
      })
    );
    const ownerLedger = await asOwner.json();
    expect(asOwner.status).toBe(200);
    expect(ownerLedger.revenues).toHaveLength(1);
    expect(ownerLedger.revenues[0].workId).toBe(release.workId);
    expect(ownerLedger.revenues[0].releaseId).toBe(release.id);
    expect(ownerLedger.revenues[0].revenueId).not.toBe("rev:unlinked-historic");
    expect(ownerLedger.value).toHaveLength(2);
    const bps = ownerLedger.value.map((row: { shareBps: number }) => row.shareBps).sort((a: number, b: number) => b - a);
    expect(bps).toEqual([8000, 2000]);
    expect(ownerLedger.value.every((row: { actorRef: string }) => row.actorRef.startsWith("moc:actor:"))).toBe(true);
    expect(ownerLedger.value.some((row: { actorRef: string }) => row.actorRef.startsWith("0x"))).toBe(false);
    expect(JSON.stringify(ownerLedger)).not.toMatch(/Maya Ruiz|Leo Vargas|Sofía Chen|Burn Again/);

    const impersonate = await getEntitlements(
      new NextRequest("http://localhost/api/economics/entitlements", {
        headers: { cookie: ownerCookie, "x-actor-ref": carlos },
      })
    );
    expect(impersonate.status).toBe(403);

    const asCarlosRelease = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, {
        headers: { cookie: carlosCookie },
      })
    );
    const carlosReleaseJson = await asCarlosRelease.json();
    expect(asCarlosRelease.status).toBe(200);
    expect(carlosReleaseJson.access).toBe("participant");
    expect(carlosReleaseJson.value).toHaveLength(1);
    expect(carlosReleaseJson.value[0].actorRef).toBe(carlos);
    expect(carlosReleaseJson.value[0].shareBps).toBe(8000);

    const asCarlosOwn = await getEntitlements(
      new NextRequest("http://localhost/api/economics/entitlements", { headers: { cookie: carlosCookie } })
    );
    const carlosJson = await asCarlosOwn.json();
    expect(carlosJson.value).toHaveLength(1);
    expect(carlosJson.value[0].actorRef).toBe(carlos);
    expect(carlosJson.value[0].shareBps).toBe(8000);

    const economics = createPrismaEconomicsStore(client);
    const execution = createPrismaExecutionStore(client);
    const entitlement = carlosJson.value[0];
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement.entitlementId,
      actorRef: carlos,
    });
    const settled = await executeSettlementIntent({
      economics,
      execution,
      adapter: createMockSettlementExecutionAdapter(),
      intentRef: intent.intentRef,
      actorRef: carlos,
    });
    expect(isSimulatedMockReceipt(settled.receipt)).toBe(true);
    expect(isOnChainReceipt(settled.receipt)).toBe(false);

    const afterSettle = await getEntitlements(
      new NextRequest("http://localhost/api/economics/entitlements", { headers: { cookie: carlosCookie } })
    );
    const settledJson = await afterSettle.json();
    expect(isSimulatedMockReceipt(settledJson.value[0].execution.receipt)).toBe(true);
    expect(isOnChainReceipt(settledJson.value[0].execution.receipt)).toBe(false);
    expect(settledJson.value[0].execution.receipt.metadata.adapter).toBe("mock");

    await client.$disconnect();
    client = await reopenPrisma(db.url);
    const again = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, {
        headers: { cookie: ownerCookie },
      })
    );
    expect((await again.json()).value).toHaveLength(2);

    const demo = buildDemoRoyaltyEngine();
    expect(demo.participants.some((row) => row.name === "Maya Ruiz")).toBe(true);
  });
});
