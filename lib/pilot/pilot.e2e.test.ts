import { afterEach, describe, expect, it } from "vitest";
import { upsertProfile } from "@/lib/artist-profile/repository";
import { persistMusicRelease } from "@/lib/domain/releaseRepository";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  createPrismaEconomicsStore,
  createPrismaRightsStore,
  money,
  openSettlementIntent,
  recordRevenueOnce,
} from "@/lib/domain/economics";
import { createPrismaExecutionStore } from "@/lib/domain/economics/execution/prismaStore";
import { closeIsolatedPrisma, openIsolatedPrisma, reopenPrisma } from "@/lib/persistence/testDatabase";
import type { PrismaClient } from "@prisma/client";

describe("PILOT-01 band work participation rights revenue entitlement intent", { timeout: 20_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("persists the minimum real band path and survives reconnect", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;

    const band = await client.actor.create({ data: { actorRef: "moc:actor:banda-los-andes" } });
    const collaborator = await client.actor.create({ data: { actorRef: "moc:actor:productor-local" } });
    expect(band.actorRef.startsWith("moc:actor:")).toBe(true);

    await upsertProfile(null, { artisticName: "Los Andes" }, band.actorRef);
    const release = await persistMusicRelease({
      actorRef: band.actorRef,
      primaryDisplayName: "Los Andes",
      title: "Single de prueba",
      releaseType: "single",
      language: "es",
      primaryGenre: "folk",
      secondaryGenre: "",
      description: "",
      coverUrl: null,
      soloCreator: false,
      collaborators: [
        {
          id: "c1",
          name: "Los Andes",
          email: "",
          role: "performer",
          percentage: 70,
          actorRef: band.actorRef,
        },
        {
          id: "c2",
          name: "Productor",
          email: "",
          role: "producer",
          percentage: 30,
          actorRef: collaborator.actorRef,
        },
      ],
      pricingModels: [],
      priceUsdc: 0,
      tokenId: null,
      tracks: [{ title: "Tema 1", version: "", durationSec: null, explicit: false, lyrics: "", previewUrl: null }],
    });

    const rights = createPrismaRightsStore(client);
    await rights.putRight({
      rightId: `right:${release.workId}`,
      actorRef: band.actorRef,
      objectKind: "work",
      objectId: release.workId,
      kind: "master",
    });

    const economics = createPrismaEconomicsStore(client);
    const execution = createPrismaExecutionStore(client);
    const assessed = await recordRevenueOnce(economics, {
      revenueId: "rev:pilot-01",
      distributionId: "dist:pilot-01",
      gross: money(1_000_000n, "USDC"),
      policy: MOC_PRODUCT_FEE_POLICY_V1,
      workId: release.workId,
      releaseId: release.id,
      rule: {
        ruleId: "pilot-split",
        shares: [
          { actorRef: band.actorRef, bps: 7_000, source: { kind: "participation" } },
          { actorRef: collaborator.actorRef, bps: 3_000, source: { kind: "participation" } },
        ],
      },
      occurredAt: "2026-09-13T18:00:00.000Z",
    });
    const entitlement = assessed.entitlements.find((row) => row.actorRef === band.actorRef);
    expect(entitlement).toBeTruthy();
    const intent = await openSettlementIntent(economics, execution, {
      entitlementId: entitlement!.entitlementId,
      actorRef: band.actorRef,
      occurredAt: "2026-09-13T18:00:00.000Z",
    });

    await client.$disconnect();
    client = await reopenPrisma(db.url);

    const economics2 = createPrismaEconomicsStore(client);
    const execution2 = createPrismaExecutionStore(client);
    const rights2 = createPrismaRightsStore(client);
    expect(await client.actor.findUnique({ where: { actorRef: band.actorRef } })).toBeTruthy();
    expect((await rights2.listRightsByActor(band.actorRef))[0]?.objectId).toBe(release.workId);
    expect(await economics2.getRevenue("rev:pilot-01")).toBeTruthy();
    expect(await economics2.getEntitlement(entitlement!.entitlementId)).toMatchObject({
      actorRef: band.actorRef,
      status: "accrued",
    });
    expect((await execution2.getIntent(intent.intentRef))?.intentRef).toBe(intent.intentRef);
    expect(intent.intentRef).not.toMatch(/^0x/);
  });
});
