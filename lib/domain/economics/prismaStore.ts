import type { PrismaClient } from "@prisma/client";
import type { ActorRef } from "../types";
import { money } from "./money";
import type { ProtocolFeePolicy } from "./policy";
import type {
  AssessedRevenue,
  DistributionShare,
  EconomicEntitlement,
  PaymentRecord,
  SettlementRecord,
} from "./types";
import type { EconomicsStore } from "./store";

function moneyFrom(units: string, asset: string, scale: number) {
  return money(units, asset, scale);
}

function toEntitlement(row: {
  id: string;
  revenueId: string;
  distributionId: string;
  actorRef: string;
  units: string;
  scale: number;
  asset: string;
  shareBps: number;
  sourceKind: string;
  sourceId: string | null;
  status: string;
  createdAt: Date;
  settledAt: Date | null;
}): EconomicEntitlement {
  return {
    entitlementId: row.id,
    actorRef: row.actorRef,
    revenueId: row.revenueId,
    distributionId: row.distributionId,
    amount: moneyFrom(row.units, row.asset, row.scale),
    shareBps: row.shareBps,
    source: {
      kind: row.sourceKind as DistributionShare["source"]["kind"],
      id: row.sourceId ?? undefined,
    },
    status: row.status as EconomicEntitlement["status"],
    createdAt: row.createdAt.toISOString(),
    settledAt: row.settledAt?.toISOString(),
  };
}

function toAssessed(
  row: {
    id: string;
    originKind: string;
    originId: string;
    saleId: string | null;
    workId: string | null;
    releaseId: string | null;
    grossUnits: string;
    protocolFeeUnits: string;
    convenienceFeeUnits: string;
    netUnits: string;
    scale: number;
    asset: string;
    policyId: string;
    policyVersion: number;
    protocolFeeBps: number;
    convenienceFeeBps: number;
    ruleId: string;
    occurredAt: Date;
    entitlements: Parameters<typeof toEntitlement>[0][];
  }
): AssessedRevenue {
  const gross = moneyFrom(row.grossUnits, row.asset, row.scale);
  const protocol = moneyFrom(row.protocolFeeUnits, row.asset, row.scale);
  const convenience = moneyFrom(row.convenienceFeeUnits, row.asset, row.scale);
  const net = moneyFrom(row.netUnits, row.asset, row.scale);
  const policy: ProtocolFeePolicy = {
    policyId: row.policyId,
    version: row.policyVersion,
    protocolFeeBps: row.protocolFeeBps,
    convenienceFeeBps: row.convenienceFeeBps,
  };
  const entitlements = row.entitlements.map(toEntitlement);
  return {
    sale: row.saleId
      ? {
          saleId: row.saleId,
          occurredAt: row.occurredAt.toISOString(),
          workId: row.workId ?? undefined,
          releaseId: row.releaseId ?? undefined,
        }
      : undefined,
    revenue: {
      revenueId: row.id,
      origin: {
        kind: row.originKind === "sale" ? "sale" : "other",
        id: row.originId,
      },
      saleId: row.saleId ?? undefined,
      workId: row.workId ?? undefined,
      releaseId: row.releaseId ?? undefined,
      gross,
      occurredAt: row.occurredAt.toISOString(),
      policyId: row.policyId,
      policyVersion: row.policyVersion,
    },
    assessment: {
      revenueId: row.id,
      policy,
      fees: [
        { kind: "protocol", amount: protocol, bps: row.protocolFeeBps, borneBy: "creator-pool" },
        { kind: "convenience", amount: convenience, bps: row.convenienceFeeBps, borneBy: "buyer" },
      ],
      netDistributable: net,
      buyerPays: money(gross.units + convenience.units, row.asset, row.scale),
    },
    distribution: {
      distributionId: entitlements[0]?.distributionId ?? `dist:${row.id}`,
      revenueId: row.id,
      ruleId: row.ruleId,
      allocations: entitlements.map((item) => ({
        actorRef: item.actorRef,
        amount: item.amount,
        bps: item.shareBps,
        source: item.source,
      })),
    },
    entitlements,
    events: [],
  };
}

export function createPrismaEconomicsStore(client: PrismaClient): EconomicsStore {
  return {
    async hasRevenue(revenueId) {
      const row = await client.economicRevenue.findUnique({ where: { id: revenueId } });
      return row != null;
    },
    async putAssessed(assessed) {
      const protocol = assessed.assessment.fees.find((line) => line.kind === "protocol");
      const convenience = assessed.assessment.fees.find((line) => line.kind === "convenience");
      await client.$transaction(async (tx) => {
        await tx.economicRevenue.create({
          data: {
            id: assessed.revenue.revenueId,
            originKind: assessed.revenue.origin.kind,
            originId: assessed.revenue.origin.id,
            saleId: assessed.revenue.saleId ?? assessed.sale?.saleId ?? null,
            workId: assessed.revenue.workId ?? null,
            releaseId: assessed.revenue.releaseId ?? null,
            grossUnits: assessed.revenue.gross.units.toString(),
            protocolFeeUnits: (protocol?.amount.units ?? 0n).toString(),
            convenienceFeeUnits: (convenience?.amount.units ?? 0n).toString(),
            netUnits: assessed.assessment.netDistributable.units.toString(),
            scale: assessed.revenue.gross.scale,
            asset: assessed.revenue.gross.asset,
            policyId: assessed.assessment.policy.policyId,
            policyVersion: assessed.assessment.policy.version,
            protocolFeeBps: assessed.assessment.policy.protocolFeeBps,
            convenienceFeeBps: assessed.assessment.policy.convenienceFeeBps,
            ruleId: assessed.distribution.ruleId,
            occurredAt: new Date(assessed.revenue.occurredAt),
          },
        });
        await tx.economicEntitlement.createMany({
          data: assessed.entitlements.map((row) => ({
            id: row.entitlementId,
            revenueId: row.revenueId,
            distributionId: row.distributionId,
            actorRef: row.actorRef,
            units: row.amount.units.toString(),
            scale: row.amount.scale,
            asset: row.amount.asset,
            shareBps: row.shareBps,
            sourceKind: row.source.kind,
            sourceId: row.source.id ?? null,
            status: row.status,
            createdAt: new Date(row.createdAt),
            settledAt: row.settledAt ? new Date(row.settledAt) : null,
          })),
        });
      });
    },
    async getRevenue(revenueId) {
      const row = await client.economicRevenue.findUnique({
        where: { id: revenueId },
        include: { entitlements: true },
      });
      return row ? toAssessed(row) : null;
    },
    async listEntitlements(actorRef: ActorRef) {
      const rows = await client.economicEntitlement.findMany({
        where: { actorRef },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toEntitlement);
    },
    async getEntitlement(entitlementId) {
      const row = await client.economicEntitlement.findUnique({ where: { id: entitlementId } });
      return row ? toEntitlement(row) : null;
    },
    async putEntitlement(entitlement) {
      await client.economicEntitlement.update({
        where: { id: entitlement.entitlementId },
        data: {
          status: entitlement.status,
          settledAt: entitlement.settledAt ? new Date(entitlement.settledAt) : null,
        },
      });
    },
    async hasSettlementFor(entitlementId) {
      const row = await client.economicSettlement.findUnique({ where: { entitlementId } });
      return row?.status === "completed";
    },
    async putSettlement(settlement: SettlementRecord, payment: PaymentRecord) {
      await client.$transaction(async (tx) => {
        await tx.economicEntitlement.update({
          where: { id: settlement.entitlementId },
          data: {
            status: "settled",
            settledAt: new Date(settlement.createdAt),
          },
        });
        await tx.economicSettlement.create({
          data: {
            id: settlement.settlementId,
            entitlementId: settlement.entitlementId,
            actorRef: settlement.actorRef,
            units: settlement.amount.units.toString(),
            scale: settlement.amount.scale,
            asset: settlement.amount.asset,
            executionLayer: settlement.executionLayer,
            destinationWallet: settlement.destinationWallet ?? null,
            status: settlement.status,
            createdAt: new Date(settlement.createdAt),
          },
        });
        await tx.economicPayment.create({
          data: {
            id: payment.paymentId,
            settlementId: payment.settlementId,
            units: payment.amount.units.toString(),
            scale: payment.amount.scale,
            asset: payment.amount.asset,
            status: payment.status,
            createdAt: new Date(payment.createdAt),
          },
        });
      });
    },
    async listRevenues() {
      const rows = await client.economicRevenue.findMany({ include: { entitlements: true } });
      return rows.map(toAssessed);
    },
  };
}
