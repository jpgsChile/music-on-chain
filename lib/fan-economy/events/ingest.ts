import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";
import { canonicalCommitments } from "@/lib/fan-economy/materialization/service";
import type { MaterializationChain } from "@/lib/fan-economy/materialization/service";
import {
  decideLockedEvent,
  payloadHash,
  type EventOutcome,
  type ObservedEvent,
} from "@/lib/fan-economy/events/decide";
import type { EventSource } from "@/lib/fan-economy/events/source";
import { hex32, redemptionHash, releaseHash } from "@/lib/fan-economy/trust/canonical";
import { readSorobanTrustConfig } from "@/lib/fan-economy/trust/rpc";
import { createSorobanMaterializationClient, keypairFromSecret } from "@/lib/fan-economy/trust/sorobanClient";
import { createSorobanEventSource } from "@/lib/fan-economy/events/source";
import { assertStellarTestnet } from "@/lib/fan-economy/trust/networkGuard";

const WINDOW = 2_000;

export type IngestReport = {
  outcomes: string[];
  lastLedger: number;
  advanced: boolean;
};

type Deps = {
  client: PrismaClient;
  source: EventSource;
  chain: Pick<MaterializationChain, "getRedemption">;
  network: "testnet";
  contractId: string;
  limit?: number;
};

function cursorId(network: string, contractId: string) {
  return `cursor:${network}:${contractId}`;
}

function observationId(network: string, contractId: string, pagingToken: string) {
  return `event:${createHash("sha256").update(`${network}:${contractId}:${pagingToken}`).digest("hex")}`;
}

function uniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function canonicalFor(client: PrismaClient, hash: string) {
  const rows = await client.redemption.findMany({
    select: { id: true, units: true, revenueId: true, releaseId: true },
  });
  const row = rows.find((item) => hex32(redemptionHash(item.id)) === hash.toLowerCase());
  if (!row) return null;
  const assessed = await createPrismaEconomicsStore(client, { joined: true }).getRevenue(row.revenueId);
  if (!assessed || assessed.entitlements.length === 0) return "incomplete" as const;
  const commitments = canonicalCommitments({
    redemptionId: row.id,
    revenueId: assessed.revenue.revenueId,
    shares: assessed.entitlements.map((entry) => ({ actorRef: entry.actorRef, shareBps: entry.shareBps })),
  });
  return {
    redemptionId: row.id,
    revenueId: assessed.revenue.revenueId,
    amount: row.units,
    targetHash: hex32(releaseHash(row.releaseId)),
    ...commitments,
  };
}

async function confirmEvidence(
  tx: Prisma.TransactionClient,
  input: { network: string; contractId: string; redemptionId: string; revenueId: string; transactionHash: string; ledger: number; materializationHash: string }
) {
  const existing = await tx.economicChainEvidence.findUnique({
    where: { network_contractId_redemptionId: { network: input.network, contractId: input.contractId, redemptionId: input.redemptionId } },
  });
  if (existing?.state === "confirmed") return;
  const data = {
    state: "confirmed",
    transactionHash: input.transactionHash,
    ledger: input.ledger,
    materializationHash: input.materializationHash,
    publishedAt: new Date(),
    lastError: null,
  };
  if (!existing) {
    await tx.economicChainEvidence.create({
      data: {
        id: `evidence:${input.network}:${input.contractId}:${input.redemptionId}`,
        redemptionId: input.redemptionId,
        revenueId: input.revenueId,
        network: input.network,
        contractId: input.contractId,
        ...data,
      },
    });
    return;
  }
  await tx.economicChainEvidence.updateMany({
    where: { id: existing.id, state: { in: ["pending", "submitting", "failed"] } },
    data,
  });
}

/** Reconcile one observed event. A duplicate paging token does not write the economy. */
export async function applyObservedEvent(event: ObservedEvent, deps: Deps): Promise<EventOutcome | "RPC_FAILURE"> {
  assertStellarTestnet(deps.network);
  const seen = await deps.client.chainEventObservation.findUnique({
    where: { network_contractId_pagingToken: { network: deps.network, contractId: event.contractId, pagingToken: event.pagingToken } },
  });
  if (seen) return "DUPLICATE";
  const loaded = event.canonicalHash ? await canonicalFor(deps.client, event.canonicalHash) : null;
  const canonical = loaded && loaded !== "incomplete" ? loaded : null;
  const evidence = canonical
    ? await deps.client.economicChainEvidence.findUnique({
        where: { network_contractId_redemptionId: { network: deps.network, contractId: deps.contractId, redemptionId: canonical.redemptionId } },
      })
    : null;
  let outcome = decideLockedEvent({
    event,
    expectedContractId: deps.contractId,
    canonical,
    chain: "unread",
    evidence,
    duplicate: false,
  });
  if (loaded === "incomplete") outcome = "INCOMPLETE";
  if (outcome === "REQUIRES_CHAIN_READ" && canonical) {
    let chain;
    try {
      chain = await deps.chain.getRedemption(canonical.redemptionId);
    } catch {
      return "RPC_FAILURE";
    }
    outcome = decideLockedEvent({
      event,
      expectedContractId: deps.contractId,
      canonical,
      chain,
      evidence,
      duplicate: false,
    });
  }
  try {
    await deps.client.$transaction(async (tx) => {
      await tx.chainEventObservation.create({
        data: {
          id: observationId(deps.network, event.contractId, event.pagingToken),
          network: deps.network,
          contractId: event.contractId,
          ledger: event.ledger,
          transactionHash: event.transactionHash,
          pagingToken: event.pagingToken,
          eventType: event.eventType || "unknown",
          canonicalHash: event.canonicalHash,
          amount: event.amount,
          payloadHash: payloadHash(event),
          outcome,
        },
      });
      if (outcome === "MATCHED" && canonical) {
        await confirmEvidence(tx, {
          network: deps.network,
          contractId: deps.contractId,
          redemptionId: canonical.redemptionId,
          revenueId: canonical.revenueId,
          transactionHash: event.transactionHash,
          ledger: event.ledger,
          materializationHash: canonical.materializationHash,
        });
      }
    });
  } catch (error) {
    if (uniqueConflict(error)) return "DUPLICATE";
    throw error;
  }
  return outcome;
}

/**
 * Ingest contract events for the configured network and contract.
 * The cursor advances only after a window is read without an RPC failure.
 */
export async function ingestContractEvents(deps: Deps): Promise<IngestReport> {
  assertStellarTestnet(deps.network);
  const current = await deps.client.chainEventCursor.findUnique({
    where: { network_contractId: { network: deps.network, contractId: deps.contractId } },
  });
  const outcomes: string[] = [];
  let head: { latestLedger: number; oldestLedger: number };
  try {
    head = await deps.source.latest();
  } catch {
    return { outcomes, lastLedger: current?.lastLedger ?? 0, advanced: false };
  }
  const start = current ? current.lastLedger + 1 : Math.max(head.oldestLedger, head.latestLedger - WINDOW + 1);
  if (start > head.latestLedger) return { outcomes, lastLedger: current?.lastLedger ?? 0, advanced: false };
  const end = Math.min(start + WINDOW - 1, head.latestLedger);
  const limit = deps.limit ?? 100;
  let pageCursor: string | undefined;
  for (let guard = 0; guard < 50; guard += 1) {
    let page: Awaited<ReturnType<EventSource["getEvents"]>>;
    try {
      page = await deps.source.getEvents(
        pageCursor ? { cursor: pageCursor, limit } : { startLedger: start, endLedger: end, limit }
      );
    } catch {
      return { outcomes, lastLedger: current?.lastLedger ?? 0, advanced: false };
    }
    for (const event of page.events) {
      const outcome = await applyObservedEvent(event, deps);
      if (outcome === "RPC_FAILURE") return { outcomes, lastLedger: current?.lastLedger ?? 0, advanced: false };
      outcomes.push(outcome);
    }
    if (page.events.length < limit) break;
    if (!page.cursor || page.cursor === pageCursor) break;
    pageCursor = page.cursor;
  }
  await deps.client.chainEventCursor.upsert({
    where: { network_contractId: { network: deps.network, contractId: deps.contractId } },
    create: { id: cursorId(deps.network, deps.contractId), network: deps.network, contractId: deps.contractId, lastLedger: end },
    update: { lastLedger: end, pagingToken: null },
  });
  return { outcomes, lastLedger: end, advanced: true };
}

/** Server-configured reconciliation. Browser input cannot select the network or the contract. */
export async function ingestConfiguredContractEvents(
  client: PrismaClient,
  env: Record<string, string | undefined> = process.env
): Promise<IngestReport | { status: "not-configured" }> {
  if (env.MOC_TRUST_EXECUTION?.trim() !== "soroban") return { status: "not-configured" };
  if (!env.STELLAR_NETWORK && !env.STELLAR_RPC_URL && !env.MOC_FAN_ECONOMY_CONTRACT_ID && !env.MOC_MATERIALIZER_SECRET) {
    return { status: "not-configured" };
  }
  let config: ReturnType<typeof readSorobanTrustConfig>;
  try {
    config = readSorobanTrustConfig(env);
  } catch (error) {
    if (error instanceof Error && error.message === "STELLAR_MAINNET_FORBIDDEN") throw error;
    return { status: "not-configured" };
  }
  const secret = env.MOC_MATERIALIZER_SECRET;
  if (!secret) return { status: "not-configured" };
  const chain = createSorobanMaterializationClient({
    contractId: config.contractId,
    rpcUrl: config.rpcUrl,
    materializer: keypairFromSecret(secret, config.materializerPublicKey),
  });
  return ingestContractEvents({
    client,
    source: createSorobanEventSource(config.rpcUrl, config.contractId),
    chain,
    network: "testnet",
    contractId: config.contractId,
  });
}
