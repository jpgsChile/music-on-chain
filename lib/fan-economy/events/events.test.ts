import { afterEach, describe, expect, it } from "vitest";
import { nativeToScVal, xdr } from "@stellar/stellar-sdk";
import type { PrismaClient } from "@prisma/client";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";
import {
  acceptMission,
  authorizeReward,
  createCampaign,
  createMission,
  recordVerification,
  redeemReward,
  submitEvidence,
} from "@/lib/fan-economy/service";
import type { ChainSnapshot } from "@/lib/fan-economy/materialization/decision";
import { canonicalCommitments } from "@/lib/fan-economy/materialization/service";
import { decideLockedEvent, type ObservedEvent } from "@/lib/fan-economy/events/decide";
import { applyObservedEvent, ingestContractEvents } from "@/lib/fan-economy/events/ingest";
import { parseContractEvent } from "@/lib/fan-economy/events/parse";
import type { EventSource } from "@/lib/fan-economy/events/source";
import { hex32, redemptionHash, releaseHash } from "@/lib/fan-economy/trust/canonical";
import { closeIsolatedPrisma, openIsolatedPrisma } from "@/lib/persistence/testDatabase";

const ARTIST = "moc:actor:11111111-1111-4111-8111-111111111111";
const FAN = "moc:actor:22222222-2222-4222-8222-222222222222";
const USDC = { asset: "USDC", scale: 6 };
const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const OTHER = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
const TX = "254c5bf94602f0b0dda45d52fc44720186e462e3c7d018e8e467975029d7922a";

function event(partial: Partial<ObservedEvent> & Pick<ObservedEvent, "pagingToken" | "canonicalHash">): ObservedEvent {
  return {
    ledger: 20,
    transactionHash: TX,
    contractId: CONTRACT,
    eventType: "RedemptionLocked",
    amount: "1000000",
    successful: true,
    ...partial,
  };
}

describe("contract event reconciliation", { timeout: 40_000 }, () => {
  let client: PrismaClient | undefined;
  let file: string | undefined;

  afterEach(async () => {
    if (client) await closeIsolatedPrisma(client, file);
    client = undefined;
  });

  it("parses a RedemptionLocked topic and amount without a materialization hash", () => {
    const hash = Buffer.from("ab".repeat(32), "hex");
    const parsed = parseContractEvent({
      id: "page-1",
      ledger: 5018595,
      txHash: TX,
      contractId: CONTRACT,
      inSuccessfulContractCall: true,
      topic: [xdr.ScVal.scvSymbol("RedemptionLocked"), xdr.ScVal.scvBytes(hash)],
      value: nativeToScVal(1000000n, { type: "i128" }),
    });
    expect(parsed.eventType).toBe("RedemptionLocked");
    expect(parsed.canonicalHash).toBe("ab".repeat(32));
    expect(parsed.amount).toBe("1000000");
    expect(parsed).not.toHaveProperty("materializationHash");
    const canonical = {
      redemptionId: "redemption:1",
      amount: "1000000",
      redemptionHash: "ab".repeat(32),
      materializationHash: "cd".repeat(32),
      distributionHash: "11".repeat(32),
      targetHash: "22".repeat(32),
    };
    expect(decideLockedEvent({
      event: parsed,
      expectedContractId: CONTRACT,
      canonical,
      chain: "unread",
      evidence: null,
      duplicate: false,
    })).toBe("REQUIRES_CHAIN_READ");
  });

  it("reconciles RedemptionLocked only against an existing canonical redemption", async () => {
    const opened = await openIsolatedPrisma();
    client = opened.client;
    const prisma = opened.client;
    file = opened.file;
    await prisma.actor.upsert({ where: { actorRef: ARTIST }, update: {}, create: { actorRef: ARTIST } });
    const work = await prisma.musicalWork.create({ data: { actorRef: ARTIST, title: "Obra" } });
    const release = await prisma.musicRelease.create({
      data: { workId: work.id, actorRef: ARTIST, title: "Lanzamiento", releaseType: "single", language: "es", primaryGenre: "pop" },
    });
    await prisma.participation.create({
      data: { releaseId: release.id, displayName: "Artista", actorRef: ARTIST, role: "performer", revenueSharePercent: 100 },
    });
    const campaign = await createCampaign({ artistActorRef: ARTIST, title: "Campaña", committed: { units: 10_000_000n, ...USDC } }, prisma);
    const mission = await createMission({
      artistActorRef: ARTIST,
      campaignId: campaign.id,
      title: "Misión",
      criterion: "Escuchar",
      maximumReward: { units: 5_000_000n, ...USDC },
      assignmentMode: "fan-accept",
    }, prisma);
    const assignment = await acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma);
    const submitted = await submitEvidence({ fanActorRef: FAN, assignmentId: assignment.id, statement: "listo" }, prisma);
    await recordVerification({ verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: submitted.id, outcome: "accepted" }, prisma);
    const reward = await authorizeReward({ artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: 5_000_000n, ...USDC } }, prisma);
    const redeemed = await redeemReward({
      fanActorRef: FAN,
      rewardEntitlementId: reward.id,
      amount: { units: 1_000_000n, ...USDC },
      redemptionId: "redemption:event-recovery",
      releaseId: release.id,
    }, prisma);
    const assessed = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId);
    if (!assessed) throw new Error("REVENUE_MISSING");
    const commitments = canonicalCommitments({
      redemptionId: redeemed.redemptionId,
      revenueId: assessed.revenue.revenueId,
      shares: assessed.entitlements.map((entry) => ({ actorRef: entry.actorRef, shareBps: entry.shareBps })),
    });
    const hash = hex32(redemptionHash(redeemed.redemptionId));
    const locked: ChainSnapshot = {
      status: "locked",
      grantId: "aa".repeat(32),
      amount: "1000000",
      targetHash: hex32(releaseHash(release.id)),
      distributionHash: commitments.distributionHash,
      materializationHash: commitments.materializationHash,
    };
    let chain: ChainSnapshot | null = locked;
    let failRead = false;
    let reads = 0;
    const chainPort = {
      async getRedemption() {
        reads += 1;
        if (failRead) throw new Error("RPC");
        return chain;
      },
    };
    const deps = { client: prisma, source: {} as EventSource, chain: chainPort, network: "testnet" as const, contractId: CONTRACT };
    const revenuesBefore = await prisma.economicRevenue.count();
    const redemptionsBefore = await prisma.redemption.count();
    const actorsBefore = await prisma.actor.count();

    function pages(rows: ObservedEvent[]): EventSource & { calls: number } {
      const api = {
        calls: 0,
        async latest() {
          return { latestLedger: 100, oldestLedger: 1 };
        },
        async getEvents(request: { cursor?: string; limit: number }) {
          api.calls += 1;
          const offset = request.cursor ? Number(request.cursor) : 0;
          const slice = rows.slice(offset, offset + request.limit);
          return { events: slice, cursor: String(offset + slice.length), latestLedger: 100 };
        },
      };
      return api;
    }

    const failing = pages([]);
    failing.getEvents = async () => {
      throw new Error("RPC");
    };
    const failed = await ingestContractEvents({ ...deps, source: failing });
    expect(failed.advanced).toBe(false);
    expect(failed.lastLedger).toBe(0);

    const empty = await ingestContractEvents({ ...deps, source: pages([]) });
    expect(empty.advanced).toBe(true);
    expect(empty.outcomes).toEqual([]);
    expect(await prisma.economicChainEvidence.count()).toBe(0);

    await prisma.chainEventCursor.update({
      where: { network_contractId: { network: "testnet", contractId: CONTRACT } },
      data: { lastLedger: 0 },
    });
    await prisma.economicChainEvidence.create({
      data: {
        id: `evidence:testnet:${CONTRACT}:${redeemed.redemptionId}`,
        redemptionId: redeemed.redemptionId,
        revenueId: redeemed.revenueId,
        network: "testnet",
        contractId: CONTRACT,
        state: "submitting",
      },
    });
    failRead = true;
    const blocked = await ingestContractEvents({
      ...deps,
      limit: 1,
      source: pages([event({ pagingToken: "lock-1", canonicalHash: hash })]),
    });
    expect(blocked.advanced).toBe(false);
    expect((await prisma.economicChainEvidence.findFirst())?.state).toBe("submitting");
    failRead = false;

    const unknown = event({ pagingToken: "unknown", canonicalHash: "ee".repeat(32) });
    const first = await ingestContractEvents({
      ...deps,
      limit: 1,
      source: pages([event({ pagingToken: "lock-1", canonicalHash: hash }), unknown]),
    });
    expect(first.outcomes).toEqual(["MATCHED", "UNKNOWN_CANONICAL_RECORD"]);
    expect(first.advanced).toBe(true);
    expect(reads).toBeGreaterThan(1);
    const confirmed = await prisma.economicChainEvidence.findFirst();
    expect(confirmed?.state).toBe("confirmed");
    expect(confirmed?.transactionHash).toBe(TX);
    expect(confirmed?.ledger).toBe(20);
    expect(confirmed?.materializationHash).toBe(commitments.materializationHash);

    const restart = await ingestContractEvents({ ...deps, source: pages([event({ pagingToken: "lock-1", canonicalHash: hash })]) });
    expect(restart.outcomes).toEqual([]);
    expect(restart.lastLedger).toBe(100);

    await prisma.chainEventCursor.update({
      where: { network_contractId: { network: "testnet", contractId: CONTRACT } },
      data: { lastLedger: 0 },
    });
    const repeated = await ingestContractEvents({
      ...deps,
      source: pages([event({ pagingToken: "lock-1", canonicalHash: hash }), unknown]),
    });
    expect(repeated.outcomes).toEqual(["DUPLICATE", "DUPLICATE"]);
    expect(await prisma.chainEventObservation.count()).toBe(2);

    await prisma.economicChainEvidence.update({ where: { id: confirmed!.id }, data: { state: "failed", transactionHash: null, ledger: null, materializationHash: null, publishedAt: null } });
    await prisma.chainEventObservation.deleteMany({ where: { pagingToken: "lock-1" } });
    const recovered = await applyObservedEvent(event({ pagingToken: "lock-1", canonicalHash: hash }), deps);
    expect(recovered).toBe("MATCHED");
    expect((await prisma.economicChainEvidence.findFirst())?.state).toBe("confirmed");

    const duplicate = await applyObservedEvent(event({ pagingToken: "lock-1", canonicalHash: hash }), deps);
    expect(duplicate).toBe("DUPLICATE");

    const malformed = await applyObservedEvent(event({ pagingToken: "bad", canonicalHash: hash, amount: null }), deps);
    expect(malformed).toBe("INCOMPLETE");
    const wrongContract = await applyObservedEvent(event({ pagingToken: "other-contract", canonicalHash: hash, contractId: OTHER }), deps);
    expect(wrongContract).toBe("INCOMPLETE");
    await expect(ingestContractEvents({ ...deps, network: "public" as "testnet", source: pages([]) })).rejects.toThrow("STELLAR_MAINNET_FORBIDDEN");

    chain = { ...locked, materializationHash: "ff".repeat(32) };
    const conflict = await applyObservedEvent(event({ pagingToken: "conflict", canonicalHash: hash }), deps);
    expect(conflict).toBe("PAYLOAD_CONFLICT");
    expect((await prisma.economicChainEvidence.findFirst())?.materializationHash).toBe(commitments.materializationHash);

    chain = locked;
    const same = await applyObservedEvent(event({ pagingToken: "same-hash", canonicalHash: hash }), deps);
    expect(same).toBe("MATCHED");
    expect((await prisma.economicChainEvidence.findFirst())?.materializationHash).toBe(commitments.materializationHash);

    await prisma.economicChainEvidence.update({ where: { id: confirmed!.id }, data: { materializationHash: "99".repeat(32) } });
    const held = await applyObservedEvent(event({ pagingToken: "held-conflict", canonicalHash: hash }), deps);
    expect(held).toBe("PAYLOAD_CONFLICT");
    expect((await prisma.economicChainEvidence.findFirst())?.materializationHash).toBe("99".repeat(32));

    await prisma.economicChainEvidence.delete({ where: { id: confirmed!.id } });
    await prisma.chainEventObservation.deleteMany({ where: { pagingToken: "before-row" } });
    const beforeRow = await applyObservedEvent(event({ pagingToken: "before-row", canonicalHash: hash }), deps);
    expect(beforeRow).toBe("MATCHED");
    expect(await prisma.economicChainEvidence.count()).toBe(1);

    expect(await prisma.economicRevenue.count()).toBe(revenuesBefore);
    expect(await prisma.redemption.count()).toBe(redemptionsBefore);
    expect(await prisma.actor.count()).toBe(actorsBefore);

    await prisma.economicChainEvidence.update({
      where: { network_contractId_redemptionId: { network: "testnet", contractId: CONTRACT, redemptionId: redeemed.redemptionId } },
      data: { state: "submitting" },
    });
    const [left, right] = await Promise.all([
      applyObservedEvent(event({ pagingToken: "race", canonicalHash: hash }), deps),
      applyObservedEvent(event({ pagingToken: "race", canonicalHash: hash }), deps),
    ]);
    expect([left, right].sort()).toEqual(["DUPLICATE", "MATCHED"]);
    expect(await prisma.chainEventObservation.count({ where: { pagingToken: "race" } })).toBe(1);
    expect(await prisma.economicRevenue.count()).toBe(revenuesBefore);
  });
});
