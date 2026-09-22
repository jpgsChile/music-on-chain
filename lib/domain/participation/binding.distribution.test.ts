import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { POST as postAccept, GET as previewAccept } from "@/app/api/participations/accept/route";
import { POST as postInvite } from "@/app/api/participations/invite/route";
import { GET as getParticipations } from "@/app/api/participations/route";
import { POST as postRevenue } from "@/app/api/economics/revenue/route";
import { persistMusicRelease } from "@/lib/domain/releaseRepository";
import {
  createMockSettlementExecutionAdapter,
  createPrismaEconomicsStore,
  createPrismaRightsStore,
  distributionRuleFromParticipations,
  executeSettlementIntent,
  isSimulatedMockReceipt,
  openSettlementIntent,
  percentToBps,
} from "@/lib/domain/economics";
import { createPrismaExecutionStore } from "@/lib/domain/economics/execution/prismaStore";
import { issueActorSession } from "@/lib/auth/actorSession";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { provisionThenBind } from "@/lib/c-bind/session";
import { closeIsolatedPrisma, openIsolatedPrisma, reopenPrisma } from "@/lib/persistence/testDatabase";
import type { PrismaClient } from "@prisma/client";

const TIME = "2026-09-13T21:00:00.000Z";
const PROOF = { sufficient: true as const };

async function bindPrivy(client: PrismaClient, subject: string) {
  const result = await provisionThenBind(createPrismaCBindStore(client), {
    authSubject: { issuer: PRIVY_ISSUER, subject },
    proof: PROOF,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("BIND_FAILED");
  expect(result.value.actorRef.startsWith("moc:actor:")).toBe(true);
  expect(result.value.actorRef).not.toBe(subject);
  expect(result.value.actorRef.startsWith("0x")).toBe(false);
  return result.value.actorRef;
}

async function sessionCookie(client: PrismaClient, actorRef: string, subject: string) {
  const issued = await issueActorSession({ actorRef, issuer: PRIVY_ISSUER, subject }, client);
  return `moc_actor_session=${issued.token}`;
}

function jsonRequest(url: string, cookie: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function publishVengeance(ownerActorRef: string) {
  return persistMusicRelease({
    actorRef: ownerActorRef,
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
      {
        id: "carlos",
        name: "Carlos Concha",
        email: "carlos.concha@example.test",
        role: "author",
        percentage: 80,
        actorRef: null,
      },
      {
        id: "pablo",
        name: "Pablo Guzman",
        email: "pablo.guzman@example.test",
        role: "composer",
        percentage: 20,
        actorRef: null,
      },
    ],
    pricingModels: [],
    priceUsdc: 0,
    tokenId: null,
    tracks: [{ title: "VENGEANCE", version: "", durationSec: 180, explicit: false, lyrics: "", previewUrl: null }],
  });
}

describe("Participant Actor binding and participation distribution", { timeout: 20_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("binds real C-BIND Actors to Vengeance participations and distributes 1 USDC 80/20", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;

    const ownerSubject = "did:privy:cleaver-owner";
    const carlosSubject = "did:privy:carlos-concha";
    const pabloSubject = "did:privy:pablo-guzman";
    const ownerActorRef = await bindPrivy(client, ownerSubject);
    const carlosActorRef = await bindPrivy(client, carlosSubject);
    const pabloActorRef = await bindPrivy(client, pabloSubject);
    expect(new Set([ownerActorRef, carlosActorRef, pabloActorRef]).size).toBe(3);

    const release = await publishVengeance(ownerActorRef);
    const [carlos, pablo] = release.participations;
    expect(carlos.displayName).toBe("Carlos Concha");
    expect(carlos.actorRef).toBeNull();
    expect(pablo.displayName).toBe("Pablo Guzman");
    expect(pablo.actorRef).toBeNull();
    expect(carlos.role).toBe("author");
    expect(pablo.role).toBe("composer");
    expect(carlos.revenueSharePercent).toBe(80);
    expect(pablo.revenueSharePercent).toBe(20);

    expect(() =>
      distributionRuleFromParticipations(
        release.participations.map((row) => ({
          id: row.id,
          actorRef: row.actorRef,
          revenueSharePercent: row.revenueSharePercent,
        }))
      )
    ).toThrow("PARTICIPANTS_UNBOUND");

    const ownerCookie = await sessionCookie(client, ownerActorRef, ownerSubject);
    const listedPending = await getParticipations(
      new NextRequest(`http://localhost/api/participations?actorRef=${encodeURIComponent(ownerActorRef)}`, {
        headers: { cookie: ownerCookie },
      })
    );
    const pendingJson = await listedPending.json();
    expect(pendingJson.value.every((row: { bindingStatus: string }) => row.bindingStatus === "pending")).toBe(true);

    const inviteCarlos = await postInvite(
      jsonRequest("http://localhost/api/participations/invite", ownerCookie, { participationId: carlos.id })
    );
    const invitePablo = await postInvite(
      jsonRequest("http://localhost/api/participations/invite", ownerCookie, { participationId: pablo.id })
    );
    expect(inviteCarlos.status).toBe(200);
    expect(invitePablo.status).toBe(200);
    const carlosPath = (await inviteCarlos.json()).value.path as string;
    const pabloPath = (await invitePablo.json()).value.path as string;
    const carlosToken = new URL(carlosPath, "http://localhost").searchParams.get("token");
    const pabloToken = new URL(pabloPath, "http://localhost").searchParams.get("token");
    expect(carlosToken).toBeTruthy();
    expect(pabloToken).toBeTruthy();

    const listedInvited = await getParticipations(
      new NextRequest(`http://localhost/api/participations?actorRef=${encodeURIComponent(ownerActorRef)}`, {
        headers: { cookie: ownerCookie },
      })
    );
    const invitedJson = await listedInvited.json();
    expect(invitedJson.value.map((row: { bindingStatus: string }) => row.bindingStatus).sort()).toEqual([
      "invited",
      "invited",
    ]);

    const ownerAccept = await postAccept(
      jsonRequest("http://localhost/api/participations/accept", ownerCookie, { token: carlosToken })
    );
    expect(ownerAccept.status).toBe(403);
    expect((await ownerAccept.json()).error).toBe("OWNER_CANNOT_ACCEPT_COLLABORATOR_INVITE");

    const ownerPreview = await previewAccept(
      new NextRequest(`http://localhost/api/participations/accept?token=${encodeURIComponent(carlosToken!)}`, {
        headers: { cookie: ownerCookie },
      })
    );
    const ownerPreviewJson = await ownerPreview.json();
    expect(ownerPreview.status).toBe(200);
    expect(ownerPreviewJson.value.currentIsOwner).toBe(true);
    expect(ownerPreviewJson.value.canAccept).toBe(false);
    expect(ownerPreviewJson.value.displayName).toBe("Carlos Concha");

    const badToken = await postAccept(
      jsonRequest("http://localhost/api/participations/accept", await sessionCookie(client, carlosActorRef, carlosSubject), {
        token: "not-a-real-invite",
      })
    );
    expect(badToken.status).toBe(400);

    const carlosCookie = await sessionCookie(client, carlosActorRef, carlosSubject);
    const pabloCookie = await sessionCookie(client, pabloActorRef, pabloSubject);
    const acceptCarlos = await postAccept(
      jsonRequest("http://localhost/api/participations/accept", carlosCookie, { token: carlosToken })
    );
    const acceptPablo = await postAccept(
      jsonRequest("http://localhost/api/participations/accept", pabloCookie, { token: pabloToken })
    );
    expect(acceptCarlos.status).toBe(200);
    expect(acceptPablo.status).toBe(200);
    expect((await acceptCarlos.json()).value.actorRef).toBe(carlosActorRef);
    expect((await acceptPablo.json()).value.actorRef).toBe(pabloActorRef);

    const replayCarlos = await postAccept(
      jsonRequest("http://localhost/api/participations/accept", carlosCookie, { token: carlosToken })
    );
    expect(replayCarlos.status).toBe(400);

    const boundRows = await client.participation.findMany({ where: { releaseId: release.id }, orderBy: { createdAt: "asc" } });
    expect(boundRows[0]?.actorRef).toBe(carlosActorRef);
    expect(boundRows[1]?.actorRef).toBe(pabloActorRef);
    expect(boundRows[0]?.role).toBe("author");
    expect(boundRows[1]?.role).toBe("composer");
    expect(boundRows[0]?.revenueSharePercent).toBe(80);
    expect(boundRows[1]?.revenueSharePercent).toBe(20);

    expect(() =>
      distributionRuleFromParticipations([
        { id: boundRows[0]!.id, actorRef: "0x1111111111111111111111111111111111111111", revenueSharePercent: 80 },
        { id: boundRows[1]!.id, actorRef: pabloActorRef, revenueSharePercent: 20 },
      ])
    ).toThrow("WALLET_IS_NOT_BENEFICIARY");
    expect(() =>
      distributionRuleFromParticipations([
        { id: boundRows[0]!.id, actorRef: carlosSubject, revenueSharePercent: 80 },
        { id: boundRows[1]!.id, actorRef: pabloActorRef, revenueSharePercent: 20 },
      ])
    ).toThrow("SHARE_REQUIRES_ACTOR");
    expect(() =>
      distributionRuleFromParticipations([
        { id: boundRows[0]!.id, actorRef: carlosActorRef, revenueSharePercent: 70 },
        { id: boundRows[1]!.id, actorRef: pabloActorRef, revenueSharePercent: 20 },
      ])
    ).toThrow("SHARES_MUST_SUM_TO_10000_BPS");

    const rule = distributionRuleFromParticipations(
      boundRows.map((row) => ({
        id: row.id,
        actorRef: row.actorRef,
        revenueSharePercent: row.revenueSharePercent,
      }))
    );
    expect(rule.ruleId).toBe("from-participation");
    expect(rule.shares.map((share) => share.source.kind)).toEqual(["participation", "participation"]);
    expect(percentToBps(80)).toBe(8000);
    expect(percentToBps(20)).toBe(2000);
    expect(rule.shares.map((share) => share.bps).sort((a, b) => b - a)).toEqual([8000, 2000]);
    expect(rule.shares.reduce((sum, share) => sum + share.bps, 0)).toBe(10000);

    const spoof = await postRevenue(
      jsonRequest("http://localhost/api/economics/revenue", ownerCookie, {
        grossUnits: "1000000",
        asset: "USDC",
        scale: 6,
        workId: release.workId,
        releaseId: release.id,
        shares: [{ actorRef: ownerActorRef, bps: 10000, sourceKind: "rule" }],
      })
    );
    const spoofJson = await spoof.json();
    expect(spoof.status).toBe(200);
    expect(spoofJson.value.workId).toBe(release.workId);
    expect(spoofJson.value.releaseId).toBe(release.id);
    expect(spoofJson.value.entitlements).toHaveLength(2);
    const amounts = spoofJson.value.entitlements
      .map((row: { actorRef: string; amount: { units: string } }) => ({
        actorRef: row.actorRef,
        units: row.amount.units,
      }))
      .sort((a: { units: string }, b: { units: string }) => Number(b.units) - Number(a.units));
    expect(amounts[0]).toEqual({ actorRef: carlosActorRef, units: "760000" });
    expect(amounts[1]).toEqual({ actorRef: pabloActorRef, units: "190000" });
    expect(spoofJson.value.net.units).toBe("950000");
    expect(spoofJson.value.fees.some((fee: { kind: string; bps: number }) => fee.kind === "protocol" && fee.bps === 500)).toBe(
      true
    );
    expect(amounts.every((row: { actorRef: string }) => row.actorRef.startsWith("moc:actor:"))).toBe(true);

    const stored = await createPrismaEconomicsStore(client).getRevenue(spoofJson.value.revenueId);
    expect(stored?.distribution.ruleId).toBe("from-participation");
    expect(stored?.distribution.allocations.every((row) => row.source.kind === "participation")).toBe(true);

    const duplicate = await postRevenue(
      jsonRequest("http://localhost/api/economics/revenue", ownerCookie, {
        revenueId: spoofJson.value.revenueId,
        grossUnits: "1000000",
        asset: "USDC",
        scale: 6,
        workId: release.workId,
        releaseId: release.id,
      })
    );
    expect(duplicate.status).toBe(409);

    const economics = createPrismaEconomicsStore(client);
    const execution = createPrismaExecutionStore(client);
    const adapter = createMockSettlementExecutionAdapter();
    for (const entitlement of stored!.entitlements) {
      const intent = await openSettlementIntent(economics, execution, {
        entitlementId: entitlement.entitlementId,
        actorRef: entitlement.actorRef,
        occurredAt: TIME,
      });
      const settled = await executeSettlementIntent({
        economics,
        execution,
        adapter,
        intentRef: intent.intentRef,
        actorRef: entitlement.actorRef,
        occurredAt: TIME,
      });
      expect(isSimulatedMockReceipt(settled.receipt)).toBe(true);
      const retry = await executeSettlementIntent({
        economics,
        execution,
        adapter,
        intentRef: intent.intentRef,
        actorRef: entitlement.actorRef,
        occurredAt: TIME,
      });
      expect(retry.intent.intentRef).toBe(intent.intentRef);
    }

    expect(await createPrismaRightsStore(client).listRightsByObject("release", release.id)).toEqual([]);

    await client.$disconnect();
    client = await reopenPrisma(db.url);
    const after = await client.participation.findMany({
      where: { releaseId: release.id },
      orderBy: { createdAt: "asc" },
    });
    expect(after[0]?.actorRef).toBe(carlosActorRef);
    expect(after[1]?.actorRef).toBe(pabloActorRef);
    const reloaded = await createPrismaEconomicsStore(client).getRevenue(spoofJson.value.revenueId);
    expect(reloaded?.entitlements).toHaveLength(2);
    expect(reloaded?.revenue.workId).toBe(release.workId);
  });

  it("rejects revenue on unbound Vengeance participations", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;
    const ownerSubject = "did:privy:unbound-owner";
    const ownerActorRef = await bindPrivy(client, ownerSubject);
    const release = await publishVengeance(ownerActorRef);
    const cookie = await sessionCookie(client, ownerActorRef, ownerSubject);
    const res = await postRevenue(
      jsonRequest("http://localhost/api/economics/revenue", cookie, {
        grossUnits: "1000000",
        asset: "USDC",
        scale: 6,
        workId: release.workId,
        releaseId: release.id,
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("PARTICIPANTS_UNBOUND");
  });
});
