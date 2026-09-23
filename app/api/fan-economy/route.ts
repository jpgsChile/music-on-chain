import { NextRequest, NextResponse } from "next/server";
import { isActorSession, requireActorSession } from "@/lib/auth/actorSession";
import { isFanEconomyError } from "@/lib/domain/fanEconomy/errors";
import {
  acceptMission,
  artistDesk,
  authorizeReward,
  createCampaign,
  createMission,
  fanDesk,
  recordVerification,
  redeemReward,
  releaseReward,
  reverseRedemption,
  submitEvidence,
  traceRedemption,
} from "@/lib/fan-economy/service";

function fail(error: unknown) {
  if (isFanEconomyError(error)) {
    const status =
      error.code === "FORBIDDEN" ||
      error.code === "FAN_CANNOT_SELF_VERIFY" ||
      error.code === "VERIFICATION_AUTHORITY_DENIED"
        ? 403
        : error.code === "CONCURRENCY_CONFLICT" || error.code.endsWith("PAYLOAD_CONFLICT")
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: error.code }, { status });
  }
  console.error("[fan-economy]", error);
  return NextResponse.json({ ok: false, error: "FAILED" }, { status: 500 });
}

function amount(body: Record<string, unknown>) {
  return {
    units: BigInt(String(body.units ?? "")),
    scale: Number(body.scale),
    asset: String(body.asset ?? "").trim(),
  };
}

export async function GET(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const view = request.nextUrl.searchParams.get("view");
  try {
    if (view === "artist") {
      return NextResponse.json({ ok: true, campaigns: await artistDesk(session.actorRef) });
    }
    if (view === "trace") {
      const redemptionId = request.nextUrl.searchParams.get("redemptionId")?.trim() ?? "";
      return NextResponse.json({ ok: true, value: await traceRedemption(session.actorRef, redemptionId) });
    }
    return NextResponse.json({ ok: true, ...(await fanDesk(session.actorRef)) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireActorSession(request);
  if (!isActorSession(session)) return session;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const command = String((body as { command?: unknown }).command ?? "");
  const actorRef = session.actorRef;
  try {
    switch (command) {
      case "createCampaign":
        return NextResponse.json({
          ok: true,
          value: await createCampaign({
            artistActorRef: actorRef,
            title: String(body.title ?? ""),
            committed: amount(body),
          }),
        });
      case "createMission":
        return NextResponse.json({
          ok: true,
          value: await createMission({
            artistActorRef: actorRef,
            campaignId: String(body.campaignId ?? ""),
            title: String(body.title ?? ""),
            criterion: String(body.criterion ?? ""),
            maximumReward: amount(body),
            assignmentMode: body.assignmentMode === "policy-assign" ? "policy-assign" : "fan-accept",
          }),
        });
      case "acceptMission":
        return NextResponse.json({
          ok: true,
          value: await acceptMission({ fanActorRef: actorRef, missionId: String(body.missionId ?? "") }),
        });
      case "submitEvidence":
        return NextResponse.json({
          ok: true,
          value: await submitEvidence({
            fanActorRef: actorRef,
            assignmentId: String(body.assignmentId ?? ""),
            statement: String(body.statement ?? ""),
          }),
        });
      case "recordVerification":
        return NextResponse.json({
          ok: true,
          value: await recordVerification({
            verifierActorRef: actorRef,
            assignmentId: String(body.assignmentId ?? ""),
            evidenceId: String(body.evidenceId ?? ""),
            outcome: body.outcome === "rejected" ? "rejected" : "accepted",
          }),
        });
      case "authorizeReward":
        return NextResponse.json({
          ok: true,
          value: await authorizeReward({
            artistActorRef: actorRef,
            assignmentId: String(body.assignmentId ?? ""),
            amount: amount(body),
          }),
        });
      case "releaseReward":
        return NextResponse.json({
          ok: true,
          value: await releaseReward({
            fanActorRef: actorRef,
            rewardEntitlementId: String(body.rewardEntitlementId ?? ""),
            amount: amount(body),
            commandId: String(body.commandId ?? ""),
          }),
        });
      case "redeemReward":
        return NextResponse.json({
          ok: true,
          value: await redeemReward({
            fanActorRef: actorRef,
            rewardEntitlementId: String(body.rewardEntitlementId ?? ""),
            amount: amount(body),
            redemptionId: String(body.redemptionId ?? ""),
            releaseId: String(body.releaseId ?? ""),
          }),
        });
      case "reverseRedemption":
        return NextResponse.json({
          ok: true,
          value: await reverseRedemption({
            fanActorRef: actorRef,
            redemptionId: String(body.redemptionId ?? ""),
          }),
        });
      default:
        return NextResponse.json({ ok: false, error: "UNKNOWN_COMMAND" }, { status: 400 });
    }
  } catch (error) {
    return fail(error);
  }
}
