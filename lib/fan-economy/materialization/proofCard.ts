import type { PrismaClient } from "@prisma/client";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";
import { canonicalCommitments } from "@/lib/fan-economy/materialization/service";
import { readRedemptionProof } from "@/lib/fan-economy/trust/testnetProof";
import type { MaterializationProof } from "@/lib/fan-economy/materialization/service";

export type ProofCommitments = {
  redemption: string;
  revenue: string;
  distribution: string;
  materialization: string;
};

export type ProofSubject = {
  releaseTitle: string | null;
  amount: { units: string; scale: number; asset: string };
};

export async function readProofCard(
  client: PrismaClient,
  input: { redemptionId: string; fanActorRef: string }
): Promise<{
  proof: MaterializationProof | { published: false; economicRecord: false };
  subject: ProofSubject | null;
  commitments: ProofCommitments | null;
}> {
  const proof = await readRedemptionProof(input, client);
  if (!("revenueId" in proof)) return { proof, subject: null, commitments: null };
  const redemption = await client.redemption.findUnique({ where: { id: proof.redemptionId } });
  if (!redemption) return { proof, subject: null, commitments: null };
  const release = await client.musicRelease.findUnique({
    where: { id: redemption.releaseId },
    select: { title: true },
  });
  const assessed = await createPrismaEconomicsStore(client, { joined: true }).getRevenue(proof.revenueId);
  const commitments = assessed
    ? canonicalCommitments({
        redemptionId: proof.redemptionId,
        revenueId: proof.revenueId,
        shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
      })
    : null;
  return {
    proof,
    subject: {
      releaseTitle: release?.title ?? null,
      amount: { units: redemption.units, scale: redemption.scale, asset: redemption.asset },
    },
    commitments: commitments
      ? {
          redemption: commitments.redemptionHash,
          revenue: commitments.revenueHash,
          distribution: commitments.distributionHash,
          materialization: commitments.materializationHash,
        }
      : null,
  };
}
