import { NextRequest, NextResponse } from "next/server";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  money,
  moneyToJson,
  recordRevenueOnce,
  type DistributionRule,
} from "@/lib/domain/economics";
import { getEconomicsStore } from "@/lib/domain/economics/runtime";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { logDomainEvent } from "@/lib/observability/domainLog";

export async function POST(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const units = body.grossUnits ?? body.units;
  const asset = typeof body.asset === "string" ? body.asset : "USDC";
  const scale = Number.isInteger(body.scale) ? body.scale : 6;
  const shares = Array.isArray(body.shares) ? body.shares : null;

  const rule: DistributionRule = shares
    ? {
        ruleId: typeof body.ruleId === "string" ? body.ruleId : "posted-rule",
        shares: shares.map((share: { actorRef?: string; bps?: number; sourceKind?: string; sourceId?: string }) => ({
          actorRef: String(share.actorRef ?? ""),
          bps: Number(share.bps),
          source: {
            kind: (share.sourceKind as DistributionRule["shares"][number]["source"]["kind"]) || "rule",
            id: share.sourceId,
          },
        })),
      }
    : {
        ruleId: "solo-recorder",
        shares: [{ actorRef, bps: 10_000, source: { kind: "rule" } }],
      };

  try {
    const assessed = await recordRevenueOnce(getEconomicsStore(), {
      revenueId: typeof body.revenueId === "string" ? body.revenueId : `rev:${crypto.randomUUID()}`,
      distributionId:
        typeof body.distributionId === "string" ? body.distributionId : `dist:${crypto.randomUUID()}`,
      gross: money(String(units ?? "0"), asset, scale),
      policy: MOC_PRODUCT_FEE_POLICY_V1,
      rule,
      occurredAt: typeof body.occurredAt === "string" ? body.occurredAt : new Date().toISOString(),
      sale:
        typeof body.saleId === "string"
          ? { saleId: body.saleId, occurredAt: new Date().toISOString(), workId: body.workId, releaseId: body.releaseId }
          : undefined,
      workId: typeof body.workId === "string" ? body.workId : undefined,
      releaseId: typeof body.releaseId === "string" ? body.releaseId : undefined,
    });
    logDomainEvent("economics.revenue", {
      actorRef,
      revenueId: assessed.revenue.revenueId,
      entitlements: assessed.entitlements.length,
    });
    return NextResponse.json({
      ok: true,
      value: {
        revenueId: assessed.revenue.revenueId,
        gross: moneyToJson(assessed.revenue.gross),
        net: moneyToJson(assessed.assessment.netDistributable),
        buyerPays: moneyToJson(assessed.assessment.buyerPays),
        fees: assessed.assessment.fees.map((line) => ({
          kind: line.kind,
          bps: line.bps,
          borneBy: line.borneBy,
          amount: moneyToJson(line.amount),
        })),
        entitlements: assessed.entitlements.map((row) => ({
          ...row,
          amount: moneyToJson(row.amount),
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "REVENUE_FAILED";
    const status = message === "DUPLICATE_REVENUE" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
