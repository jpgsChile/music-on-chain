import { NextRequest, NextResponse } from "next/server";
import { moneyToJson, type AssessedRevenue, type EconomicEntitlement } from "@/lib/domain/economics";
import { getEconomicsStore, getExecutionStore } from "@/lib/domain/economics/runtime";
import { resolveOwnedMusicalContext } from "@/lib/domain/releaseRepository";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";

async function wireEntitlement(row: EconomicEntitlement, origin: AssessedRevenue | null) {
  const execution = getExecutionStore();
  const intent = await execution.getIntentByEntitlement(row.entitlementId);
  return {
    ...row,
    amount: moneyToJson(row.amount),
    workId: origin?.revenue.workId ?? null,
    releaseId: origin?.revenue.releaseId ?? null,
    execution: intent
      ? {
          intentRef: intent.intentRef,
          lifecycle: await execution.lifecycle(intent.intentRef),
          receipt: await execution.latestReceipt(intent.intentRef),
        }
      : null,
  };
}

function wireRevenue(assessed: AssessedRevenue) {
  return {
    revenueId: assessed.revenue.revenueId,
    workId: assessed.revenue.workId ?? null,
    releaseId: assessed.revenue.releaseId ?? null,
    ruleId: assessed.distribution.ruleId,
    gross: moneyToJson(assessed.revenue.gross),
    net: moneyToJson(assessed.assessment.netDistributable),
    fees: assessed.assessment.fees.map((line) => ({
      kind: line.kind,
      bps: line.bps,
      amount: moneyToJson(line.amount),
    })),
  };
}

export async function GET(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const actorRef = session.actorRef;
  const requested =
    request.nextUrl.searchParams.get("actorRef")?.trim() ||
    request.headers.get("x-actor-ref")?.trim();
  if (requested && requested !== actorRef) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const economics = getEconomicsStore();
  const releaseId = request.nextUrl.searchParams.get("releaseId")?.trim() || "";

  if (releaseId) {
    const owned = await resolveOwnedMusicalContext(actorRef, { releaseId });
    if ("error" in owned) {
      return NextResponse.json({ ok: false, error: owned.error }, { status: 400 });
    }
    const assessed = (await economics.listRevenues())
      .filter((row) => row.revenue.releaseId === releaseId)
      .sort((a, b) => a.revenue.occurredAt.localeCompare(b.revenue.occurredAt));
    const value = [];
    for (const item of assessed) {
      for (const row of item.entitlements) {
        value.push(await wireEntitlement(row, item));
      }
    }
    return NextResponse.json({
      ok: true,
      value,
      revenues: assessed.map(wireRevenue),
    });
  }

  const entitlements = await economics.listEntitlements(actorRef);
  const value = await Promise.all(
    entitlements.map(async (row) => {
      const origin = await economics.getRevenue(row.revenueId);
      return wireEntitlement(row, origin);
    })
  );
  return NextResponse.json({ ok: true, value, revenues: [] });
}
