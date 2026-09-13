import type { PrismaClient } from "@prisma/client";
import { money } from "../money";
import { outcomeToLifecycle } from "./transitions";
import type { ExecutionRequest, SettlementIntent, SettlementReceipt } from "./types";
import type { ExecutionStore } from "./store";

function toIntent(row: {
  id: string;
  entitlementId: string;
  actorRef: string;
  units: string;
  scale: number;
  asset: string;
  createdAt: Date;
}): SettlementIntent {
  return {
    intentRef: row.id,
    entitlementId: row.entitlementId,
    actorRef: row.actorRef,
    amount: money(row.units, row.asset, row.scale),
    createdAt: row.createdAt.toISOString(),
  };
}

function toRequest(row: {
  id: string;
  intentRef: string;
  actorRef: string;
  destinationCapability: string | null;
  units: string;
  scale: number;
  asset: string;
  executionMode: string;
  createdAt: Date;
}): ExecutionRequest {
  return {
    requestRef: row.id,
    intentRef: row.intentRef,
    beneficiaryActorRef: row.actorRef,
    destinationCapability: row.destinationCapability,
    amount: money(row.units, row.asset, row.scale),
    executionMode: row.executionMode as ExecutionRequest["executionMode"],
    createdAt: row.createdAt.toISOString(),
  };
}

function toReceipt(row: {
  id: string;
  intentRef: string;
  requestRef: string;
  executionMode: string;
  status: string;
  externalRef: string | null;
  occurredAt: Date;
  metadata: string | null;
}): SettlementReceipt {
  return {
    receiptRef: row.id,
    intentRef: row.intentRef,
    requestRef: row.requestRef,
    executionMode: row.executionMode as SettlementReceipt["executionMode"],
    status: row.status as SettlementReceipt["status"],
    externalRef: row.externalRef ?? undefined,
    occurredAt: row.occurredAt.toISOString(),
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
  };
}

export function createPrismaExecutionStore(client: PrismaClient): ExecutionStore {
  return {
    async getIntent(intentRef) {
      const row = await client.settlementIntent.findUnique({ where: { id: intentRef } });
      return row ? toIntent(row) : null;
    },
    async getIntentByEntitlement(entitlementId) {
      const row = await client.settlementIntent.findUnique({ where: { entitlementId } });
      return row ? toIntent(row) : null;
    },
    async putIntent(intent) {
      try {
        await client.settlementIntent.create({
          data: {
            id: intent.intentRef,
            entitlementId: intent.entitlementId,
            actorRef: intent.actorRef,
            units: intent.amount.units.toString(),
            scale: intent.amount.scale,
            asset: intent.amount.asset,
            createdAt: new Date(intent.createdAt),
          },
        });
      } catch (error) {
        const existing = await client.settlementIntent.findUnique({
          where: { entitlementId: intent.entitlementId },
        });
        if (!existing) throw error;
      }
    },
    async getRequest(requestRef) {
      const row = await client.executionRequestRecord.findUnique({ where: { id: requestRef } });
      return row ? toRequest(row) : null;
    },
    async listRequests(intentRef) {
      const rows = await client.executionRequestRecord.findMany({
        where: { intentRef },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toRequest);
    },
    async putRequest(request) {
      await client.executionRequestRecord.upsert({
        where: { id: request.requestRef },
        create: {
          id: request.requestRef,
          intentRef: request.intentRef,
          actorRef: request.beneficiaryActorRef,
          destinationCapability: request.destinationCapability,
          units: request.amount.units.toString(),
          scale: request.amount.scale,
          asset: request.amount.asset,
          executionMode: request.executionMode,
          createdAt: new Date(request.createdAt),
        },
        update: {},
      });
    },
    async latestReceipt(intentRef) {
      const row = await client.settlementReceiptRecord.findFirst({
        where: { intentRef },
        orderBy: { occurredAt: "desc" },
      });
      return row ? toReceipt(row) : null;
    },
    async listReceipts(intentRef) {
      const rows = await client.settlementReceiptRecord.findMany({
        where: { intentRef },
        orderBy: { occurredAt: "asc" },
      });
      return rows.map(toReceipt);
    },
    async putReceipt(receipt) {
      await client.settlementReceiptRecord.upsert({
        where: {
          intentRef_requestRef: { intentRef: receipt.intentRef, requestRef: receipt.requestRef },
        },
        create: {
          id: receipt.receiptRef,
          intentRef: receipt.intentRef,
          requestRef: receipt.requestRef,
          executionMode: receipt.executionMode,
          status: receipt.status,
          externalRef: receipt.externalRef ?? null,
          occurredAt: new Date(receipt.occurredAt),
          metadata: receipt.metadata ? JSON.stringify(receipt.metadata) : null,
        },
        update: {
          status: receipt.status,
          externalRef: receipt.externalRef ?? null,
          occurredAt: new Date(receipt.occurredAt),
          metadata: receipt.metadata ? JSON.stringify(receipt.metadata) : null,
        },
      });
    },
    async lifecycle(intentRef) {
      const latest = await this.latestReceipt(intentRef);
      if (!latest) return "pending";
      return outcomeToLifecycle(latest.status);
    },
  };
}
