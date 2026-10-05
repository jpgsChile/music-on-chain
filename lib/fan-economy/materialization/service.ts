import type { PrismaClient } from "@prisma/client";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";
import {
  actorHash,
  assetHash,
  campaignHash,
  distributionHash,
  hex32,
  materializationHash,
  redemptionHash,
  releaseHash,
  revenueHash,
} from "@/lib/fan-economy/trust/canonical";
import { decidePublication, type ChainSnapshot, type PublicationState } from "@/lib/fan-economy/materialization/decision";
import { decideReserve, decideReward, type GrantView, type ReserveView } from "@/lib/fan-economy/materialization/ensure";

export type ChainReceipt = {
  transactionHash: string;
  ledger: number;
  redemption: ChainSnapshot;
};

/** Narrow chain port. The materializer signs lock. The capability signs redeem. */
export type MaterializationChain = {
  getRedemption(redemptionId: string): Promise<ChainSnapshot | null>;
  lockRedemption(input: { redemptionId: string; revenueId: string; distributionHash: string }): Promise<ChainReceipt>;
  redeemControlled?(input: {
    redemptionId: string;
    assignmentId: string;
    amount: string;
    releaseId: string;
    distributionHash: string;
  }): Promise<ChainReceipt>;
  recover(transactionHash: string): Promise<"pending" | "failed" | ChainReceipt>;
  readCampaign?(campaignId: string): Promise<ReserveView | null>;
  commitReserve?(input: {
    campaignId: string;
    authorityActorRef: string;
    asset: string;
    scale: number;
    amount: string;
  }): Promise<{ transactionHash: string; ledger: number }>;
  readReward?(assignmentId: string): Promise<GrantView | null>;
  authorizeReward?(input: {
    assignmentId: string;
    campaignId: string;
    fanActorRef: string;
    amount: string;
  }): Promise<{ transactionHash: string; ledger: number }>;
};

export type MaterializationProof = {
  redemptionId: string;
  revenueId: string;
  network: "testnet";
  contractId: string;
  economicRecord: true;
  publicationState: PublicationState;
  contractStatus: ChainSnapshot["status"] | "missing";
  materializationHash: string | null;
  transactionHash: string | null;
  ledger: number | null;
  publishedAt: string | null;
  verification: "verified" | "pending" | "failed" | "inconsistent" | "conflict";
  lastError: string | null;
};

type Deps = {
  client: PrismaClient;
  chain: MaterializationChain;
  network: "testnet";
  contractId: string;
  controlledActorRef: string | null;
  authorityActorRef?: string | null;
};

export function canonicalCommitments(input: {
  redemptionId: string;
  revenueId: string;
  shares: { actorRef: string; shareBps: number }[];
}) {
  const distribution = distributionHash(input.shares);
  return {
    distributionHash: hex32(distribution),
    redemptionHash: hex32(redemptionHash(input.redemptionId)),
    revenueHash: hex32(revenueHash(input.revenueId)),
    materializationHash: hex32(
      materializationHash({
        redemptionId: input.redemptionId,
        revenueId: input.revenueId,
        distribution,
      })
    ),
  };
}

function evidenceKey(network: string, contractId: string, redemptionId: string) {
  return `evidence:${network}:${contractId}:${redemptionId}`;
}

function verificationFor(
  state: PublicationState,
  chain: ChainSnapshot | null,
  expected: string,
  transactionHash: string | null,
  ledger: number | null,
  lastError: string | null
): MaterializationProof["verification"] {
  if (lastError === "VERIFICATION_INCONSISTENT") return "inconsistent";
  if (lastError === "PAYLOAD_CONFLICT") return "conflict";
  const locked =
    chain?.status === "locked" &&
    (chain.materializationHash ?? "").toLowerCase() === expected.toLowerCase();
  if (state === "confirmed" && locked && transactionHash && ledger != null) return "verified";
  if (state === "failed") return "failed";
  return "pending";
}

export async function materializeRedemption(
  input: { redemptionId: string; fanActorRef: string },
  deps: Deps
): Promise<MaterializationProof> {
  if (deps.network !== "testnet") throw new Error("STELLAR_MAINNET_FORBIDDEN");
  const redemption = await deps.client.redemption.findUnique({
    where: { id: input.redemptionId },
    include: { reward: true },
  });
  if (!redemption || redemption.fanActorRef !== input.fanActorRef) throw new FanEconomyError("FORBIDDEN");
  const assessed = await createPrismaEconomicsStore(deps.client, { joined: true }).getRevenue(redemption.revenueId);
  if (!assessed) throw new FanEconomyError("REVENUE_NOT_FOUND");
  if (assessed.revenue.origin.kind !== "redemption" || assessed.revenue.origin.id !== redemption.id) {
    throw new FanEconomyError("REDEMPTION_REVENUE_MISMATCH");
  }
  if (redemption.revenueId !== assessed.revenue.revenueId) throw new FanEconomyError("REDEMPTION_REVENUE_MISMATCH");
  if (assessed.entitlements.length === 0) throw new FanEconomyError("ENTITLEMENTS_MISSING");
  const commitments = canonicalCommitments({
    redemptionId: redemption.id,
    revenueId: assessed.revenue.revenueId,
    shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
  });
  const id = evidenceKey(deps.network, deps.contractId, redemption.id);
  await deps.client.economicChainEvidence.upsert({
    where: { network_contractId_redemptionId: { network: deps.network, contractId: deps.contractId, redemptionId: redemption.id } },
    update: {},
    create: {
      id,
      redemptionId: redemption.id,
      revenueId: assessed.revenue.revenueId,
      network: deps.network,
      contractId: deps.contractId,
      state: "pending",
    },
  });
  if (redemption.state === "reversed" || assessed.revenue.status === "reversed") {
    return finish(deps, id, redemption.id, "NOT_COMMITTED", null);
  }
  const prerequisite = await ensurePrerequisites(deps, {
    campaignId: redemption.reward.campaignId,
    assignmentId: redemption.reward.assignmentId,
    fanActorRef: redemption.fanActorRef,
    authorizedUnits: redemption.reward.authorizedUnits,
  });
  if (prerequisite) return finish(deps, id, redemption.id, prerequisite, null);
  const controlled =
    Boolean(deps.chain.redeemControlled) &&
    deps.controlledActorRef != null &&
    deps.controlledActorRef === redemption.fanActorRef;
  return execute(deps, {
    id,
    redemptionId: redemption.id,
    revenueId: assessed.revenue.revenueId,
    assignmentId: redemption.reward.assignmentId,
    amount: redemption.units,
    releaseId: redemption.releaseId,
    distributionHash: commitments.distributionHash,
    materializationHash: commitments.materializationHash,
    targetHash: hex32(releaseHash(redemption.releaseId)),
    controlled,
    pass: 0,
  });
}

type Job = {
  id: string;
  redemptionId: string;
  revenueId: string;
  assignmentId: string;
  amount: string;
  releaseId: string;
  distributionHash: string;
  materializationHash: string;
  targetHash: string;
  controlled: boolean;
  pass: number;
  held?: boolean;
};

async function execute(deps: Deps, job: Job): Promise<MaterializationProof> {
  let chain: ChainSnapshot | null;
  try {
    chain = await deps.chain.getRedemption(job.redemptionId);
  } catch {
    const existing = await deps.client.economicChainEvidence.findUnique({ where: { id: job.id } });
    if (existing?.state === "confirmed") return finish(deps, job.id, job.redemptionId, "VERIFICATION_INCONSISTENT", null);
    return finish(deps, job.id, job.redemptionId, "RPC_FAILURE", null);
  }
  const evidence = await deps.client.economicChainEvidence.findUnique({ where: { id: job.id } });
  if (!evidence) throw new FanEconomyError("REVENUE_NOT_FOUND");
  const decision = decidePublication({
    evidence: { state: evidence.state as PublicationState, transactionHash: evidence.transactionHash },
    chain,
    expectedMaterializationHash: job.materializationHash,
    expectedDistributionHash: job.distributionHash,
    expectedAmount: job.amount,
    expectedTargetHash: job.targetHash,
    controlledRedeem: job.controlled,
  });
  if (decision.kind === "confirm-existing") {
    await deps.client.economicChainEvidence.update({
      where: { id: job.id },
      data: {
        state: "confirmed",
        materializationHash: job.materializationHash,
        lastError: null,
        publishedAt: evidence.publishedAt ?? (evidence.transactionHash ? new Date() : null),
      },
    });
    return finish(deps, job.id, job.redemptionId, null, chain);
  }
  if (decision.kind === "payload-conflict") return finish(deps, job.id, job.redemptionId, "PAYLOAD_CONFLICT", chain);
  if (decision.kind === "inconsistent") return finish(deps, job.id, job.redemptionId, "VERIFICATION_INCONSISTENT", chain);
  if (decision.kind === "missing-redemption") return finish(deps, job.id, job.redemptionId, "PREREQUISITE_MISSING", chain);
  if (decision.kind === "not-committed") return finish(deps, job.id, job.redemptionId, "NOT_COMMITTED", chain);
  if (decision.kind === "reconcile") {
    let recovered: "pending" | "failed" | ChainReceipt;
    try {
      recovered = await deps.chain.recover(decision.transactionHash);
    } catch {
      return finish(deps, job.id, job.redemptionId, "RPC_FAILURE", chain);
    }
    if (recovered === "pending" || job.pass > 0) {
      return finish(deps, job.id, job.redemptionId, recovered === "failed" ? "RPC_FAILURE" : null, chain);
    }
    if (recovered === "failed") {
      await deps.client.economicChainEvidence.update({
        where: { id: job.id },
        data: { state: "pending", transactionHash: null },
      });
      return execute(deps, { ...job, pass: job.pass + 1 });
    }
    const locked =
      recovered.redemption.status === "locked" &&
      (recovered.redemption.materializationHash ?? "").toLowerCase() === job.materializationHash.toLowerCase();
    if (locked) {
      await confirm(deps, job.id, recovered.transactionHash, recovered.ledger, job.materializationHash);
      return finish(deps, job.id, job.redemptionId, null, recovered.redemption);
    }
    await deps.client.economicChainEvidence.update({
      where: { id: job.id },
      data: { state: "pending", transactionHash: null },
    });
    return execute(deps, { ...job, controlled: false, pass: job.pass + 1 });
  }
  if (decision.kind === "redeem-then-lock") {
    if (!deps.chain.redeemControlled) return finish(deps, job.id, job.redemptionId, "PREREQUISITE_MISSING", chain);
    if (!(await claim(deps, job.id))) return finish(deps, job.id, job.redemptionId, null, chain);
    try {
      await deps.chain.redeemControlled({
        redemptionId: job.redemptionId,
        assignmentId: job.assignmentId,
        amount: job.amount,
        releaseId: job.releaseId,
        distributionHash: job.distributionHash,
      });
    } catch (error) {
      return failCall(deps, job.id, job.redemptionId, error, chain);
    }
    return execute(deps, { ...job, controlled: false, pass: job.pass + 1, held: true });
  }
  if (!job.held && !(await claim(deps, job.id))) return finish(deps, job.id, job.redemptionId, null, chain);
  try {
    const receipt = await deps.chain.lockRedemption({
      redemptionId: job.redemptionId,
      revenueId: job.revenueId,
      distributionHash: job.distributionHash,
    });
    const matches =
      receipt.redemption.status === "locked" &&
      (receipt.redemption.materializationHash ?? "").toLowerCase() === job.materializationHash.toLowerCase();
    if (!matches) return finish(deps, job.id, job.redemptionId, "PAYLOAD_CONFLICT", receipt.redemption);
    await confirm(deps, job.id, receipt.transactionHash, receipt.ledger, job.materializationHash);
    return finish(deps, job.id, job.redemptionId, null, receipt.redemption);
  } catch (error) {
    return failCall(deps, job.id, job.redemptionId, error, chain);
  }
}

async function claim(deps: Deps, id: string): Promise<boolean> {
  const claimed = await deps.client.economicChainEvidence.updateMany({
    where: { id, state: { in: ["pending", "failed"] } },
    data: { state: "submitting", attemptCount: { increment: 1 }, lastError: null },
  });
  return claimed.count === 1;
}

async function ensurePrerequisites(
  deps: Deps,
  input: { campaignId: string; assignmentId: string; fanActorRef: string; authorizedUnits: string }
): Promise<string | null> {
  if (!deps.chain.readCampaign || !deps.chain.readReward) return null;
  const campaign = await deps.client.campaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign) return "PREREQUISITE_MISSING";
  const authorityAvailable = deps.authorityActorRef === campaign.artistActorRef && Boolean(deps.chain.commitReserve);
  let reserve: ReserveView | null;
  try {
    reserve = await deps.chain.readCampaign(campaign.id);
  } catch {
    return "RPC_FAILURE";
  }
  const reserveStep = decideReserve({
    chain: reserve,
    authorityActor: hex32(actorHash(campaign.artistActorRef)),
    assetHash: hex32(assetHash(campaign.asset)),
    scale: String(campaign.scale),
    committedUnits: campaign.committedUnits,
    authorityAvailable,
  });
  if (reserveStep === "conflict") return "PAYLOAD_CONFLICT";
  if (reserveStep === "not-ready") return "PREREQUISITE_MISSING";
  if (reserveStep === "create") {
    try {
      await deps.chain.commitReserve?.({
        campaignId: campaign.id,
        authorityActorRef: campaign.artistActorRef,
        asset: campaign.asset,
        scale: campaign.scale,
        amount: campaign.committedUnits,
      });
    } catch (error) {
      return error instanceof Error && error.message === "PAYLOAD_CONFLICT" ? "PAYLOAD_CONFLICT" : "RPC_FAILURE";
    }
  }
  const rewardAvailable = authorityAvailable && Boolean(deps.chain.authorizeReward);
  let grant: GrantView | null;
  try {
    grant = await deps.chain.readReward(input.assignmentId);
  } catch {
    return "RPC_FAILURE";
  }
  const rewardStep = decideReward({
    chain: grant,
    campaignId: hex32(campaignHash(campaign.id)),
    actorHash: hex32(actorHash(input.fanActorRef)),
    authorized: input.authorizedUnits,
    authorityAvailable: rewardAvailable,
  });
  if (rewardStep === "conflict") return "PAYLOAD_CONFLICT";
  if (rewardStep === "not-ready") return "PREREQUISITE_MISSING";
  if (rewardStep === "create") {
    try {
      await deps.chain.authorizeReward?.({
        assignmentId: input.assignmentId,
        campaignId: campaign.id,
        fanActorRef: input.fanActorRef,
        amount: input.authorizedUnits,
      });
    } catch (error) {
      return error instanceof Error && error.message === "PAYLOAD_CONFLICT" ? "PAYLOAD_CONFLICT" : "RPC_FAILURE";
    }
  }
  return null;
}

export type ReconciliationDecision = "CONFIRMED" | "RETRY_SAFE" | "PAYLOAD_CONFLICT" | "INCONSISTENT" | "NOT_READY";

export function reconciliationDecision(proof: MaterializationProof): ReconciliationDecision {
  if (proof.verification === "verified") return "CONFIRMED";
  if (proof.verification === "conflict" || proof.lastError === "PAYLOAD_CONFLICT") return "PAYLOAD_CONFLICT";
  if (proof.verification === "inconsistent" || (proof.contractStatus === "locked" && !proof.transactionHash)) return "INCONSISTENT";
  if (
    proof.lastError === "PREREQUISITE_MISSING" ||
    proof.lastError === "CAPABILITY_NOT_CONFIGURED" ||
    proof.lastError === "NOT_COMMITTED" ||
    proof.lastError === "ENTITLEMENTS_MISSING"
  ) {
    return "NOT_READY";
  }
  return "RETRY_SAFE";
}

export async function reconcileMaterialization(
  input: { redemptionId: string; fanActorRef: string },
  deps: Deps
): Promise<{ decision: ReconciliationDecision; proof: MaterializationProof }> {
  const proof = await materializeRedemption(input, deps);
  return { decision: reconciliationDecision(proof), proof };
}

async function confirm(deps: Deps, id: string, transactionHash: string, ledger: number, materializationHash: string) {
  await deps.client.economicChainEvidence.update({
    where: { id },
    data: {
      state: "confirmed",
      transactionHash,
      ledger,
      materializationHash,
      publishedAt: new Date(),
      lastError: null,
    },
  });
}

async function failCall(deps: Deps, id: string, redemptionId: string, error: unknown, chain: ChainSnapshot | null) {
  const code = error instanceof Error && error.message ? error.message : "RPC_FAILURE";
  const known = ["PAYLOAD_CONFLICT", "PREREQUISITE_MISSING", "NOT_COMMITTED", "AUTHORIZATION_MISMATCH", "SUBMISSION_TIMEOUT", "CONTRACT_RESULT", "RPC_FAILURE"].includes(code)
    ? code
    : "RPC_FAILURE";
  const hash = error instanceof Error && "transactionHash" in error ? (error as { transactionHash?: string | null }).transactionHash : null;
  if ((known === "SUBMISSION_TIMEOUT" || known === "CONTRACT_RESULT") && hash) {
    await deps.client.economicChainEvidence.update({
      where: { id },
      data: { state: "submitting", transactionHash: hash, lastError: known },
    });
    return finish(deps, id, redemptionId, known, chain);
  }
  return finish(deps, id, redemptionId, known, chain);
}

async function finish(
  deps: Deps,
  id: string,
  redemptionId: string,
  error: string | null,
  chain: ChainSnapshot | null
): Promise<MaterializationProof> {
  const existing = await deps.client.economicChainEvidence.findUnique({ where: { id } });
  if (!existing) throw new FanEconomyError("REVENUE_NOT_FOUND");
  const keepConfirmed = existing.state === "confirmed" && (error === "VERIFICATION_INCONSISTENT" || error === null);
  const state: PublicationState = keepConfirmed
    ? "confirmed"
    : error
      ? error === "SUBMISSION_TIMEOUT" || error === "CONTRACT_RESULT"
        ? "submitting"
        : "failed"
      : (existing.state as PublicationState);
  const row = await deps.client.economicChainEvidence.update({
    where: { id },
    data: {
      state,
      lastError: error,
    },
  });
  const verification = verificationFor(
    row.state as PublicationState,
    chain,
    row.materializationHash ?? "",
    row.transactionHash,
    row.ledger,
    error
  );
  return {
    redemptionId,
    revenueId: row.revenueId,
    network: "testnet",
    contractId: row.contractId,
    economicRecord: true,
    publicationState: row.state as PublicationState,
    contractStatus: chain?.status ?? "missing",
    materializationHash: row.materializationHash,
    transactionHash: row.transactionHash,
    ledger: row.ledger,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    verification,
    lastError: error,
  };
}
