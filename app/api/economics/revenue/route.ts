import { NextRequest, NextResponse } from "next/server";
import {
  MOC_PRODUCT_FEE_POLICY_V1,
  distributionRuleFromRelease,
  money,
  moneyToJson,
  recordRevenueOnce,
  type DistributionRule,
} from "@/lib/domain/economics";
import { getEconomicsStore } from "@/lib/domain/economics/runtime";
import { resolveOwnedMusicalContext } from "@/lib/domain/releaseRepository";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { logDomainEvent } from "@/lib/observability/domainLog";
import { getPrisma } from "@/lib/db";

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

  const context = await resolveOwnedMusicalContext(actorRef, {
    workId: typeof body.workId === "string" ? body.workId : null,
    releaseId: typeof body.releaseId === "string" ? body.releaseId : null,
  });
  if ("error" in context) {
    return NextResponse.json({ ok: false, error: context.error }, { status: 400 });
  }

  let rule: DistributionRule;
  try {
    if (context.releaseId) {
      rule = await distributionRuleFromRelease(context.releaseId, getPrisma());
    } else if (shares) {
      rule = {
        ruleId: typeof body.ruleId === "string" ? body.ruleId : "posted-rule",
        shares: shares.map((share: { actorRef?: string; bps?: number; sourceKind?: string; sourceId?: string }) => ({
          actorRef: String(share.actorRef ?? ""),
          bps: Number(share.bps),
          source: {
            kind: (share.sourceKind as DistributionRule["shares"][number]["source"]["kind"]) || "rule",
            id: share.sourceId,
          },
        })),
      };
    } else {
      rule = {
        ruleId: "solo-recorder",
        shares: [{ actorRef, bps: 10_000, source: { kind: "rule" } }],
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "DISTRIBUTION_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

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
          ? {
              saleId: body.saleId,
              occurredAt: new Date().toISOString(),
              workId: context.workId,
              releaseId: context.releaseId,
            }
          : undefined,
      workId: context.workId,
      releaseId: context.releaseId,
    });
    logDomainEvent("economics.revenue", {
      actorRef,
      revenueId: assessed.revenue.revenueId,
      workId: assessed.revenue.workId,
      releaseId: assessed.revenue.releaseId,
      entitlements: assessed.entitlements.length,
    });
    return NextResponse.json({
      ok: true,
      value: {
        revenueId: assessed.revenue.revenueId,
        workId: assessed.revenue.workId ?? null,
        releaseId: assessed.revenue.releaseId ?? null,
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
