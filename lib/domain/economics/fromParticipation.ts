import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { BPS_DENOMINATOR } from "./policy";
import type { DistributionRule } from "./types";

export type ParticipationShareRow = {
  id: string;
  actorRef: string | null;
  revenueSharePercent: number;
};

export function distributionRuleFromParticipations(
  rows: ParticipationShareRow[]
): DistributionRule {
  if (rows.length === 0) throw new Error("EMPTY_SHARES");
  if (rows.some((row) => !row.actorRef?.trim())) throw new Error("PARTICIPANTS_UNBOUND");

  const shares = rows.map((row) => {
    const bps = percentToBps(row.revenueSharePercent);
    if (!Number.isInteger(bps) || bps < 0 || bps > BPS_DENOMINATOR) {
      throw new Error("INVALID_SHARE_BPS");
    }
    return {
      actorRef: row.actorRef!.trim(),
      bps,
      source: { kind: "participation" as const, id: row.id },
    };
  });
  if (shares.some((share) => share.actorRef.startsWith("0x"))) {
    throw new Error("WALLET_IS_NOT_BENEFICIARY");
  }
  if (shares.some((share) => !share.actorRef.startsWith("moc:actor:"))) {
    throw new Error("SHARE_REQUIRES_ACTOR");
  }
  const sum = shares.reduce((acc, share) => acc + share.bps, 0);
  if (sum !== BPS_DENOMINATOR) throw new Error("SHARES_MUST_SUM_TO_10000_BPS");
  return { ruleId: "from-participation", shares };
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export async function distributionRuleFromRelease(
  releaseId: string,
  client: PrismaClient = getPrisma()
): Promise<DistributionRule> {
  const rows = await client.participation.findMany({
    where: { releaseId },
    orderBy: { createdAt: "asc" },
    select: { id: true, actorRef: true, revenueSharePercent: true },
  });
  return distributionRuleFromParticipations(rows);
}
