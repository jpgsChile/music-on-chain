import { NextRequest, NextResponse } from "next/server";
import { moneyToJson, settleOnce } from "@/lib/domain/economics";
import { getEconomicsStore } from "@/lib/domain/economics/runtime";

export async function POST(request: NextRequest) {
  const actorRef = request.headers.get("x-actor-ref")?.trim() || "";
  if (!actorRef) {
    return NextResponse.json({ error: "Missing actor" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.entitlementId !== "string") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = settleOnce(getEconomicsStore(), {
      entitlementId: body.entitlementId,
      settlementId:
        typeof body.settlementId === "string" ? body.settlementId : `set:${crypto.randomUUID()}`,
      actorRef,
      executionLayer: body.executionLayer === "on-chain" ? "on-chain" : "off-chain",
      destinationWallet: typeof body.destinationWallet === "string" ? body.destinationWallet : null,
      occurredAt: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true,
      value: {
        entitlement: {
          ...result.entitlement,
          amount: moneyToJson(result.entitlement.amount),
        },
        settlement: {
          ...result.settlement,
          amount: moneyToJson(result.settlement.amount),
        },
        payment: {
          ...result.payment,
          amount: moneyToJson(result.payment.amount),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SETTLEMENT_FAILED";
    const status =
      message === "NOT_BENEFICIARY"
        ? 403
        : message === "ENTITLEMENT_ALREADY_SETTLED"
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
