import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { POST as postAccept } from "@/app/api/participations/accept/route";
import { POST as postInvite } from "@/app/api/participations/invite/route";
import { GET as getParticipations } from "@/app/api/participations/route";
import { GET as getEntitlements } from "@/app/api/economics/entitlements/route";
import { POST as postRevenue } from "@/app/api/economics/revenue/route";
import { POST as postSettlement } from "@/app/api/economics/settlements/route";
import { GET as getReleases } from "@/app/api/releases/route";
import { persistMusicRelease } from "@/lib/domain/releaseRepository";
import { attachWalletToActor } from "@/lib/domain/actorWallet";
import { upsertProfile } from "@/lib/artist-profile/repository";
import { issueActorSession } from "@/lib/auth/actorSession";
import { PRIVY_ISSUER } from "@/lib/c-bind/fromPrivy";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { provisionThenBind } from "@/lib/c-bind/session";
import { closeIsolatedPrisma, openIsolatedPrisma, reopenPrisma } from "@/lib/persistence/testDatabase";
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

function post(url: string, cookie: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Actor economic visibility for owner vs beneficiary", { timeout: 25_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("lets Carlos and Pablo discover Vengeance without becoming owner", async () => {
    const db = await openIsolatedPrisma();
    client = db.client;
    file = db.file;

    const ownerSubject = "did:privy:vis-owner";
    const carlosSubject = "did:privy:vis-carlos";
    const pabloSubject = "did:privy:vis-pablo";
    const strangerSubject = "did:privy:vis-stranger";
    const owner = await bindPrivy(client, ownerSubject);
    const carlos = await bindPrivy(client, carlosSubject);
    const pablo = await bindPrivy(client, pabloSubject);
    const stranger = await bindPrivy(client, strangerSubject);
    expect(owner).not.toBe(carlosSubject);
    expect(carlos).not.toBe(carlosSubject);
    await attachWalletToActor(carlos, "0x1111111111111111111111111111111111111111");
    await upsertProfile(null, { artisticName: "Cleaver" }, owner);

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
    const strangerCookie = await cookieFor(client, stranger, strangerSubject);

    for (const participation of release.participations) {
      const invited = await postInvite(post("http://localhost/api/participations/invite", ownerCookie, { participationId: participation.id }));
      const token = new URL((await invited.json()).value.path, "http://localhost").searchParams.get("token");
      const cookie = participation.displayName === "Carlos Concha" ? carlosCookie : pabloCookie;
      await postAccept(post("http://localhost/api/participations/accept", cookie, { token }));
    }

    const ownerRevenue = await postRevenue(
      post("http://localhost/api/economics/revenue", ownerCookie, {
        grossUnits: "1000000",
        asset: "USDC",
        scale: 6,
        workId: release.workId,
        releaseId: release.id,
      })
    );
    expect(ownerRevenue.status).toBe(200);

    const ownerReleases = await getReleases(new NextRequest("http://localhost/api/releases", { headers: { cookie: ownerCookie } }));
    expect((await ownerReleases.json()).value.some((row: { title: string }) => row.title === "Vengeance")).toBe(true);

    const ownerLedger = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, { headers: { cookie: ownerCookie } })
    );
    const ownerJson = await ownerLedger.json();
    expect(ownerLedger.status).toBe(200);
    expect(ownerJson.access).toBe("owner");
    expect(ownerJson.value).toHaveLength(2);

    const carlosReleases = await getReleases(new NextRequest("http://localhost/api/releases", { headers: { cookie: carlosCookie } }));
    expect((await carlosReleases.json()).value).toHaveLength(0);

    const carlosParts = await getParticipations(new NextRequest("http://localhost/api/participations", { headers: { cookie: carlosCookie } }));
    const carlosPartJson = await carlosParts.json();
    expect(carlosPartJson.value).toHaveLength(1);
    expect(carlosPartJson.value[0].displayName).toBe("Carlos Concha");
    expect(carlosPartJson.value[0].revenueSharePercent).toBe(80);
    expect(carlosPartJson.value[0].release.title).toBe("Vengeance");
    expect(carlosPartJson.value[0].release.actorRef).toBe(owner);
    expect(carlosPartJson.value[0].release.ownerDisplayName).toBe("Cleaver");
    expect(carlosPartJson.value[0].canInvite).toBe(false);
    expect(JSON.stringify(carlosPartJson)).not.toMatch(/Maya Ruiz|0x1111111111111111111111111111111111111111/);

    const pabloParts = await getParticipations(new NextRequest("http://localhost/api/participations", { headers: { cookie: pabloCookie } }));
    const pabloPartJson = await pabloParts.json();
    expect(pabloPartJson.value[0].revenueSharePercent).toBe(20);
    expect(pabloPartJson.value[0].role).toBe("composer");

    const carlosLedger = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, { headers: { cookie: carlosCookie } })
    );
    const carlosJson = await carlosLedger.json();
    expect(carlosLedger.status).toBe(200);
    expect(carlosJson.access).toBe("participant");
    expect(carlosJson.value).toHaveLength(1);
    expect(carlosJson.value[0].actorRef).toBe(carlos);
    expect(carlosJson.value[0].shareBps).toBe(8000);
    expect(carlosJson.value[0].amount.units).toBe("760000");
    expect(carlosJson.value.some((row: { actorRef: string }) => row.actorRef === pablo)).toBe(false);

    const pabloLedger = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, { headers: { cookie: pabloCookie } })
    );
    const pabloJson = await pabloLedger.json();
    expect(pabloJson.value).toHaveLength(1);
    expect(pabloJson.value[0].actorRef).toBe(pablo);
    expect(pabloJson.value[0].shareBps).toBe(2000);
    expect(pabloJson.value[0].amount.units).toBe("190000");
    expect(pabloJson.value.some((row: { actorRef: string }) => row.actorRef === carlos)).toBe(false);

    expect(
      (await postRevenue(
        post("http://localhost/api/economics/revenue", carlosCookie, {
          grossUnits: "1000000",
          asset: "USDC",
          scale: 6,
          workId: release.workId,
          releaseId: release.id,
        })
      )).status
    ).toBe(400);
    expect(
      (await postRevenue(
        post("http://localhost/api/economics/revenue", pabloCookie, {
          grossUnits: "1000000",
          asset: "USDC",
          scale: 6,
          workId: release.workId,
          releaseId: release.id,
        })
      )).status
    ).toBe(400);

    expect(
      (await postInvite(post("http://localhost/api/participations/invite", carlosCookie, { participationId: release.participations[0].id }))).status
    ).toBe(403);
    expect(
      (await postInvite(post("http://localhost/api/participations/invite", pabloCookie, { participationId: release.participations[1].id }))).status
    ).toBe(403);

    const carlosEntitlementId = carlosJson.value[0].entitlementId as string;
    const pabloEntitlementId = pabloJson.value[0].entitlementId as string;
    expect((await postSettlement(post("http://localhost/api/economics/settlements", carlosCookie, { entitlementId: pabloEntitlementId }))).status).toBe(403);
    expect((await postSettlement(post("http://localhost/api/economics/settlements", pabloCookie, { entitlementId: carlosEntitlementId }))).status).toBe(403);
    expect(
      (
        await postSettlement(
          new NextRequest("http://localhost/api/economics/settlements", {
            method: "POST",
            headers: { cookie: ownerCookie, "content-type": "application/json", "x-actor-ref": carlos },
            body: JSON.stringify({ entitlementId: carlosEntitlementId }),
          })
        )
      ).status
    ).toBe(403);
    expect(
      (
        await postSettlement(
          post("http://localhost/api/economics/settlements", pabloCookie, {
            entitlementId: pabloEntitlementId,
            destinationCapability: "0x2222222222222222222222222222222222222222",
            executionMode: "on-chain",
          })
        )
      ).status
    ).toBe(200);
    const pabloRequests = await client.executionRequestRecord.findMany({
      where: { intentRef: { contains: pabloEntitlementId } },
    });
    expect(pabloRequests.every((row) => row.destinationCapability !== "0x2222222222222222222222222222222222222222")).toBe(
      true
    );
    expect(pabloRequests.every((row) => row.executionMode === "off-chain")).toBe(true);
    expect((await postSettlement(post("http://localhost/api/economics/settlements", carlosCookie, { entitlementId: carlosEntitlementId }))).status).toBe(200);

    expect(
      (
        await getEntitlements(
          new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, {
            headers: { cookie: ownerCookie, "x-actor-ref": carlos },
          })
        )
      ).status
    ).toBe(403);
    expect(
      (
        await getEntitlements(
          new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, { headers: { cookie: strangerCookie } })
        )
      ).status
    ).toBe(403);

    const ownerParts = await getParticipations(new NextRequest("http://localhost/api/participations", { headers: { cookie: ownerCookie } }));
    const ownerReleaseIds = [
      ...new Set(((await ownerParts.json()).value as { release: { id: string } }[]).map((row) => row.release.id)),
    ];
    expect(ownerReleaseIds.filter((id) => id === release.id)).toHaveLength(1);

    const strangerParts = await getParticipations(new NextRequest("http://localhost/api/participations", { headers: { cookie: strangerCookie } }));
    const strangerReleases = await getReleases(new NextRequest("http://localhost/api/releases", { headers: { cookie: strangerCookie } }));
    expect((await strangerParts.json()).value).toHaveLength(0);
    expect((await strangerReleases.json()).value).toHaveLength(0);

    await client.$disconnect();
    client = await reopenPrisma(db.url);
    const after = await getEntitlements(
      new NextRequest(`http://localhost/api/economics/entitlements?releaseId=${release.id}`, { headers: { cookie: carlosCookie } })
    );
    expect((await after.json()).value).toHaveLength(1);
  });
});
