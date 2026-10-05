import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { publishIfConfigured } from "@/lib/fan-economy/materialization/publish";
import { redeemReward } from "@/lib/fan-economy/service";

type RedeemInput = Parameters<typeof redeemReward>[0];

type Publisher = (
  input: { redemptionId: string; fanActorRef: string },
  client: PrismaClient
) => Promise<unknown>;

/**
 * Application boundary. redeemReward commits the canonical economy first.
 * Publication runs only after that function returns, and a Stellar failure
 * stays outside the economic result.
 */
export async function completeRedeemReward(
  input: RedeemInput,
  client: PrismaClient = getPrisma(),
  publish: Publisher = publishIfConfigured
) {
  const redemption = await redeemReward(input, client);
  try {
    await publish({ redemptionId: redemption.redemptionId, fanActorRef: input.fanActorRef }, client);
  } catch (error) {
    const code = error instanceof FanEconomyError ? error.code : "FAILED";
    console.error("[materialization]", code);
  }
  return redemption;
}
