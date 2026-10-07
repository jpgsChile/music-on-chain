/**
 * Copies the already certified hackathon operation into the isolated RC database.
 * It does not redeem, materialize, reconcile, ingest, or call a chain.
 *
 * Refuse conditions:
 * - MOC_DB_TARGET is not hackathon_rc
 * - the connection is not the dedicated Neon RC endpoint
 */
import { pathToFileURL } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "@/lib/db";
import { canonicalHash, redemptionRevenueId } from "@/lib/domain/fanEconomy/amounts";
import { MOC_REDEMPTION_FEE_POLICY_V1, recordRevenue } from "@/lib/domain/economics";
import { canonicalCommitments } from "@/lib/fan-economy/materialization/service";
import { readCertifiedHackathonProof } from "@/lib/fan-economy/public-proof/certifiedHackathonProof";
import { assertHackathonRcTarget, assertOperatorLabel } from "./target-guard.mjs";

const REDEMPTION_ID = "redeem-b3e4df75-2f1";
const REVENUE_ID = "revenue:redemption:redeem-b3e4df75-2f1";
const ARTIST = "moc:actor:8114ea00-00bf-40e1-9e89-735be899902b";
const FAN = "moc:actor:1558188b-b219-4f01-9e9d-5a0884b45b69";
const RELEASE_ID = "cmuol6tp2000pzxlvd0j3v144";
const WORK_ID = "rc-work-redeem-b3e4df75-2f1";
const CAMPAIGN_ID = "rc-campaign-redeem-b3e4df75-2f1";
const MISSION_ID = "rc-mission-redeem-b3e4df75-2f1";
const ASSIGNMENT_ID = "rc-assignment-redeem-b3e4df75-2f1";
const REWARD_ID = "reward:4c826c49-c060-49ab-94a4-7dc94c67c251";
const VERIFICATION_ID = "rc-verification-redeem-b3e4df75-2f1";
const SHARE_SOURCE_ID = "rc-share-redeem-b3e4df75-2f1";
const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const TX = "fcb8bb94eec5be7e853c2db3d59a83dbca6a5c7e3c22079e2f33dba6fc3c2119";
const LEDGER = 5041383;
const MATERIALIZATION = "a5c9d5a53c8f5e804d3a2e310438073e23a337ab77d557b498799b30506d50d9";
const UNITS = 1_000_000n;
const EVIDENCE_ID = `evidence:testnet:${CONTRACT}:${REDEMPTION_ID}`;
const OCCURRED_AT = "2026-10-04T00:00:00.000Z";

const FIELD_MANIFEST = {
  Actor: ["actorRef"],
  MusicalWork: ["id", "actorRef", "title"],
  MusicRelease: ["id", "workId", "actorRef", "title", "releaseType", "language", "primaryGenre", "status", "network", "currency"],
  Campaign: ["id", "artistActorRef", "title", "asset", "scale", "committedUnits", "reserveKind"],
  Mission: ["id", "campaignId", "title", "criterion", "maximumRewardUnits", "asset", "scale", "assignmentMode", "status"],
  MissionAssignment: ["id", "missionId", "fanActorRef", "state"],
  RewardEntitlement: ["id", "assignmentId", "campaignId", "fanActorRef", "verificationId", "authorizedUnits", "consumedUnits", "releasedUnits", "asset", "scale"],
  EconomicRevenue: ["id", "originKind", "originId", "releaseId", "grossUnits", "protocolFeeUnits", "convenienceFeeUnits", "netUnits", "scale", "asset", "policyId", "policyVersion", "protocolFeeBps", "convenienceFeeBps", "ruleId", "status", "occurredAt"],
  EconomicEntitlement: ["id", "revenueId", "distributionId", "actorRef", "units", "scale", "asset", "shareBps", "sourceKind", "sourceId", "status", "createdAt"],
  Redemption: ["id", "rewardEntitlementId", "fanActorRef", "releaseId", "units", "asset", "scale", "payloadHash", "revenueId", "state"],
  EconomicChainEvidence: ["id", "redemptionId", "revenueId", "network", "contractId", "transactionHash", "ledger", "materializationHash", "state", "publishedAt"],
};

function reject(code: string): never {
  throw new Error(code);
}

function assessedCopy() {
  if (redemptionRevenueId(REDEMPTION_ID) !== REVENUE_ID) reject("REVENUE_ID_MISMATCH");
  const assessed = recordRevenue({
    revenueId: REVENUE_ID,
    distributionId: `dist:redemption:${REDEMPTION_ID}`,
    gross: { units: UNITS, scale: 6, asset: "USDC" },
    policy: MOC_REDEMPTION_FEE_POLICY_V1,
    rule: {
      ruleId: "from-participation",
      shares: [{ actorRef: ARTIST, bps: 10_000, source: { kind: "participation", id: SHARE_SOURCE_ID } }],
    },
    releaseId: RELEASE_ID,
    origin: { kind: "redemption", id: REDEMPTION_ID },
    occurredAt: OCCURRED_AT,
  });
  if (assessed.revenue.gross.units !== UNITS) reject("GROSS_MISMATCH");
  if (assessed.assessment.policy.protocolFeeBps !== 0 || assessed.assessment.policy.convenienceFeeBps !== 0) {
    reject("FEE_MISMATCH");
  }
  if (assessed.entitlements.length !== 1) reject("ENTITLEMENT_COUNT");
  const entitlement = assessed.entitlements[0];
  if (entitlement.status !== "accrued" || entitlement.shareBps !== 10_000 || entitlement.amount.units !== UNITS) {
    reject("ENTITLEMENT_MISMATCH");
  }
  const commitments = canonicalCommitments({
    redemptionId: REDEMPTION_ID,
    revenueId: assessed.revenue.revenueId,
    shares: [{ actorRef: entitlement.actorRef, shareBps: entitlement.shareBps }],
  });
  if (commitments.materializationHash !== MATERIALIZATION) reject("MATERIALIZATION_MISMATCH");
  return { assessed, commitments, entitlement };
}

async function census(prisma: PrismaClient) {
  return {
    actors: await prisma.actor.count(),
    bindings: await prisma.identityBinding.count(),
    wallets: await prisma.actorWallet.count(),
    redemptions: await prisma.redemption.count(),
    revenues: await prisma.economicRevenue.count(),
    entitlements: await prisma.economicEntitlement.count(),
    evidence: await prisma.economicChainEvidence.count(),
    observations: await prisma.chainEventObservation.count(),
  };
}

async function certify(prisma: PrismaClient) {
  const redemption = await prisma.redemption.findUnique({ where: { id: REDEMPTION_ID } });
  const revenue = await prisma.economicRevenue.findUnique({
    where: { id: REVENUE_ID },
    include: { entitlements: true },
  });
  const evidence = await prisma.economicChainEvidence.findUnique({ where: { id: EVIDENCE_ID } });
  const proof = await readCertifiedHackathonProof(prisma);
  const counts = await census(prisma);
  if (!redemption || !revenue || !evidence || !proof.available) reject("CERTIFIED_RECORD_MISSING");
  if (counts.redemptions !== 1 || counts.revenues !== 1 || counts.entitlements !== 1 || counts.evidence !== 1) {
    reject("CERTIFIED_RECORD_NOT_UNIQUE");
  }
  if (redemption.units !== "1000000" || redemption.scale !== 6 || redemption.asset !== "USDC" || redemption.state !== "recorded") {
    reject("REDEMPTION_VALUE_MISMATCH");
  }
  if (revenue.grossUnits !== "1000000" || revenue.originKind !== "redemption" || revenue.originId !== REDEMPTION_ID) {
    reject("REVENUE_VALUE_MISMATCH");
  }
  if (revenue.entitlements.length !== 1 || revenue.entitlements[0].status !== "accrued" || revenue.entitlements[0].shareBps !== 10_000) {
    reject("ENTITLEMENT_VALUE_MISMATCH");
  }
  if (revenue.entitlements[0].settledAt != null) reject("ENTITLEMENT_SETTLED");
  if (
    evidence.state !== "confirmed" ||
    evidence.network !== "testnet" ||
    evidence.contractId !== CONTRACT ||
    evidence.transactionHash !== TX ||
    evidence.ledger !== LEDGER ||
    evidence.materializationHash !== MATERIALIZATION
  ) {
    reject("EVIDENCE_VALUE_MISMATCH");
  }
  if (
    proof.revenueId !== REVENUE_ID ||
    proof.releaseTitle !== "MOC Preprod Test" ||
    proof.support.label !== "$1.00 USDC" ||
    proof.economicStatus !== "accrued" ||
    proof.persistedVerification !== "verified" ||
    proof.protocolState !== "locked" ||
    proof.ledger !== LEDGER ||
    proof.commitments?.materialization !== MATERIALIZATION
  ) {
    reject("PUBLIC_PROJECTION_MISMATCH");
  }
  const serialized = JSON.stringify(proof);
  if (serialized.includes(ARTIST) || serialized.includes(FAN) || serialized.toLowerCase().includes("privy") || serialized.includes("@")) {
    reject("PUBLIC_PROJECTION_LEAK");
  }
  console.log(
    JSON.stringify({
      RC_CERTIFIED_RECORD: "PASS",
      counts,
      redemptionId: redemption.id,
      revenueId: revenue.id,
      redemptionState: redemption.state,
      evidenceState: evidence.state,
      network: evidence.network,
      contractMatches: evidence.contractId === CONTRACT,
      transactionMatches: evidence.transactionHash === TX,
      ledger: evidence.ledger,
      materializationMatches: evidence.materializationHash === MATERIALIZATION,
      units: redemption.units,
      scale: redemption.scale,
      asset: redemption.asset,
      entitlementStatus: revenue.entitlements[0].status,
      grossUnits: revenue.grossUnits,
      protocolFeeUnits: revenue.protocolFeeUnits,
      settled: false,
      publicTitle: proof.releaseTitle,
      publicSupport: proof.support.label,
      publicStatus: proof.economicStatus,
      protocolState: proof.protocolState,
    })
  );
}

/** Copies the certified operation. Throws before any write when the computed proof does not match. */
export async function copyCertifiedHackathonProof(prisma: PrismaClient): Promise<"inserted" | "already-present"> {
  const { assessed, commitments, entitlement } = assessedCopy();
  const existing = await prisma.redemption.findUnique({ where: { id: REDEMPTION_ID } });
  if (existing) {
    await certify(prisma);
    return "already-present";
  }
  const before = await census(prisma);
  if (before.redemptions !== 0 || before.revenues !== 0 || before.evidence !== 0) reject("UNEXPECTED_EXISTING_ECONOMICS");

  const payloadHash = canonicalHash({
    redemptionId: REDEMPTION_ID,
    rewardEntitlementId: REWARD_ID,
    fanActorRef: FAN,
    releaseId: RELEASE_ID,
    units: UNITS.toString(),
    asset: "USDC",
    scale: "6",
  });
  const occurredAt = new Date(OCCURRED_AT);

  await prisma.$transaction(async (tx) => {
    await tx.actor.create({ data: { actorRef: ARTIST } });
    await tx.musicalWork.create({ data: { id: WORK_ID, actorRef: ARTIST, title: "MOC Preprod Test" } });
    await tx.musicRelease.create({
      data: {
        id: RELEASE_ID,
        workId: WORK_ID,
        actorRef: ARTIST,
        title: "MOC Preprod Test",
        releaseType: "single",
        language: "es",
        primaryGenre: "pop",
        status: "PUBLISHED",
        network: "stellar-testnet",
        currency: "USDC",
      },
    });
    await tx.campaign.create({
      data: {
        id: CAMPAIGN_ID,
        artistActorRef: ARTIST,
        title: "RC campaign",
        asset: "USDC",
        scale: 6,
        committedUnits: UNITS.toString(),
        reserveKind: "artist",
      },
    });
    await tx.mission.create({
      data: {
        id: MISSION_ID,
        campaignId: CAMPAIGN_ID,
        title: "RC mission",
        criterion: "support",
        maximumRewardUnits: UNITS.toString(),
        asset: "USDC",
        scale: 6,
        assignmentMode: "fan-accept",
        status: "open",
      },
    });
    await tx.missionAssignment.create({
      data: { id: ASSIGNMENT_ID, missionId: MISSION_ID, fanActorRef: FAN, state: "active" },
    });
    await tx.rewardEntitlement.create({
      data: {
        id: REWARD_ID,
        assignmentId: ASSIGNMENT_ID,
        campaignId: CAMPAIGN_ID,
        fanActorRef: FAN,
        verificationId: VERIFICATION_ID,
        authorizedUnits: UNITS.toString(),
        consumedUnits: UNITS.toString(),
        releasedUnits: "0",
        asset: "USDC",
        scale: 6,
      },
    });
    await tx.economicRevenue.create({
      data: {
        id: assessed.revenue.revenueId,
        originKind: assessed.revenue.origin.kind,
        originId: assessed.revenue.origin.id,
        releaseId: RELEASE_ID,
        grossUnits: assessed.revenue.gross.units.toString(),
        protocolFeeUnits: "0",
        convenienceFeeUnits: "0",
        netUnits: assessed.assessment.netDistributable.units.toString(),
        scale: 6,
        asset: "USDC",
        policyId: assessed.assessment.policy.policyId,
        policyVersion: assessed.assessment.policy.version,
        protocolFeeBps: 0,
        convenienceFeeBps: 0,
        ruleId: assessed.distribution.ruleId,
        status: assessed.revenue.status,
        occurredAt,
      },
    });
    await tx.economicEntitlement.create({
      data: {
        id: entitlement.entitlementId,
        revenueId: entitlement.revenueId,
        distributionId: entitlement.distributionId,
        actorRef: entitlement.actorRef,
        units: entitlement.amount.units.toString(),
        scale: entitlement.amount.scale,
        asset: entitlement.amount.asset,
        shareBps: entitlement.shareBps,
        sourceKind: entitlement.source.kind,
        sourceId: entitlement.source.id ?? null,
        status: entitlement.status,
        createdAt: occurredAt,
      },
    });
    await tx.redemption.create({
      data: {
        id: REDEMPTION_ID,
        rewardEntitlementId: REWARD_ID,
        fanActorRef: FAN,
        releaseId: RELEASE_ID,
        units: UNITS.toString(),
        asset: "USDC",
        scale: 6,
        payloadHash,
        revenueId: REVENUE_ID,
        state: "recorded",
      },
    });
    await tx.economicChainEvidence.create({
      data: {
        id: EVIDENCE_ID,
        redemptionId: REDEMPTION_ID,
        revenueId: REVENUE_ID,
        network: "testnet",
        contractId: CONTRACT,
        transactionHash: TX,
        ledger: LEDGER,
        materializationHash: commitments.materializationHash,
        state: "confirmed",
        publishedAt: occurredAt,
      },
    });
  });
  await certify(prisma);
  return "inserted";
}

async function main() {
  assertOperatorLabel(process.env.MOC_DB_TARGET);
  const url = process.env.DATABASE_URL ?? "";
  const direct = process.env.DIRECT_URL ?? "";
  assertHackathonRcTarget(url, "DATABASE_URL");
  assertHackathonRcTarget(direct, "DIRECT_URL");
  for (const name of [
    "MOC_MATERIALIZER_SECRET",
    "MOC_TESTNET_CAPABILITY_SECRET",
    "MOC_TESTNET_AUTHORITY_SECRET",
    "BASE_EXECUTOR_PRIVATE_KEY",
    "MOC_TRUST_EXECUTION",
  ]) {
    if (process.env[name]) reject("SIGNING_OR_TRUST_ENV_PRESENT");
  }

  console.log(JSON.stringify({ RC_PERSONAL_DATA_MINIMIZED: "PASS", copiedFields: FIELD_MANIFEST, excluded: ["email", "IdentityBinding", "ActorWallet", "ActorSession", "Participation", "privySubject", "sessionToken", "ChainEventObservation"] }));

  const prisma = createPrismaClient(direct);
  try {
    if (process.argv.includes("--counts")) {
      console.log(JSON.stringify({ counts: await census(prisma) }));
      return;
    }
    const outcome = await copyCertifiedHackathonProof(prisma);
    console.log(JSON.stringify({ RC_SEED_IDEMPOTENCY: outcome === "inserted" ? "INSERTED" : "ALREADY_PRESENT", chainWrites: 0 }));
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "SEED_FAILED";
    console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-url]").slice(0, 500));
    process.exit(1);
  });
}
