import type { PrismaClient } from "@prisma/client";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";

/** The browser may name a redemption. It may not choose the fan, the revenue, or a hash. */
export function acceptedMaterializationBody(body: unknown): { redemptionId: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return { redemptionId: typeof record.redemptionId === "string" ? record.redemptionId.trim() : "" };
}

/**
 * Fan, release owner, or entitlement beneficiary may read the same evidence.
 * The returned actor is always the canonical fan on the redemption.
 */
export async function canonicalFanForReader(
  client: PrismaClient,
  actorRef: string,
  redemptionId: string
): Promise<string> {
  const redemption = await client.redemption.findUnique({ where: { id: redemptionId } });
  if (!redemption) throw new FanEconomyError("FORBIDDEN");
  if (redemption.fanActorRef === actorRef) return redemption.fanActorRef;
  const release = await client.musicRelease.findUnique({ where: { id: redemption.releaseId } });
  if (release?.actorRef === actorRef) return redemption.fanActorRef;
  const assessed = await createPrismaEconomicsStore(client, { joined: true }).getRevenue(redemption.revenueId);
  if (assessed?.entitlements.some((row) => row.actorRef === actorRef)) return redemption.fanActorRef;
  throw new FanEconomyError("FORBIDDEN");
}
