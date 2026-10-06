/**
 * CERTIFICATION ONLY — MAY WRITE TO STELLAR TESTNET.
 * Not part of the judge quick start.
 * One controlled Stellar Testnet certification.
 * Refuses any database that is not the local disposable certification database.
 * Never prints key material.
 */
import { execFileSync } from "node:child_process";
import { createPrismaEconomicsStore } from "@/lib/domain/economics";
import {
  acceptMission,
  authorizeReward,
  createCampaign,
  createMission,
  recordVerification,
  redeemReward,
  submitEvidence,
} from "@/lib/fan-economy/service";
import { decidePublication } from "@/lib/fan-economy/materialization/decision";
import { canonicalCommitments, materializeRedemption } from "@/lib/fan-economy/materialization/service";
import { publicationPresentation } from "@/lib/fan-economy/materialization/presentation";
import { createPrismaClient } from "@/lib/db";
import { actorHash, assetHash, assignmentHash, campaignHash, hex32, redemptionHash, releaseHash } from "@/lib/fan-economy/trust/canonical";
import { readRedemptionProof } from "@/lib/fan-economy/trust/testnetProof";
import { createSorobanMaterializationClient, keypairFromSecret, type SorobanMaterializationClient } from "@/lib/fan-economy/trust/sorobanClient";

const FAN = "moc:actor:f6f6f6f6-f6f6-46f6-86f6-f6f6f6f6f6f6";
const ARTIST = "moc:actor:e5e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5";
const FAN_PUBLIC = "GDW3BMZWIO7NL6M25XLVUBNDNKHKUYOMK7V4EOWFICDOIBZD55O32O6M";
const ARTIST_PUBLIC = "GC6TY6NERUT5GQLXXHWPR2RIKAHMNKJSTK2FBOXWTRNQNMSKYD6ONEFE";
const MATERIALIZER_PUBLIC = "GASACPYNRZL2TRKPLXKVS3PJX7TVRTOCEWTULPRKBAX2YXJYQZU3PEA7";
const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const RPC = "https://soroban-testnet.stellar.org";
const REDEMPTION_ID = "redemption:hackathon-2026-10-04";
const HISTORICAL = "redemption:testnet-flow-001";
const AUTHORIZED = 5_000_000n;
const REDEEMED = 1_000_000n;
const USDC = { asset: "USDC", scale: 6 };

const denied = new Set<string>();

function deny(value: string) {
  if (value) denied.add(value);
}

function emit(payload: unknown) {
  const text = JSON.stringify(payload, null, 2);
  for (const secret of denied) {
    if (secret.length > 8 && text.includes(secret)) throw new Error("SECRET_LEAK");
  }
  if (/S[A-Z2-7]{55}/.test(text)) throw new Error("SECRET_LEAK");
  process.stdout.write(`${text}\n`);
}

function blocked(reason: string, extra: Record<string, unknown> = {}): never {
  emit({ status: "CANONICAL_TESTNET_MATERIALIZATION_BLOCKED", reason, ...extra });
  throw new Error("BLOCKED");
}

function assertIsolatedDatabase() {
  const database = process.env.DATABASE_URL ?? "";
  const direct = process.env.DIRECT_URL ?? "";
  for (const value of [database, direct]) {
    if (!value) continue;
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      blocked("DATABASE_URL_UNPARSEABLE");
    }
    const host = parsed.hostname;
    const name = parsed.pathname.replace(/^\//, "");
    if (host !== "127.0.0.1" && host !== "localhost") blocked("DATABASE_HOST_NOT_LOCAL");
    if (name !== "moc_s3_cert") blocked("DATABASE_NAME_NOT_CERTIFICATION");
    const lowered = value.toLowerCase();
    if (["supabase", "neon", "amazonaws", "pooler", "preprod"].some((token) => lowered.includes(token))) {
      blocked("DATABASE_NOT_DISPOSABLE");
    }
  }
  if (!database) blocked("DATABASE_URL_MISSING");
  if (process.env.MOC_TRUST_EXECUTION === "soroban") blocked("TRUST_EXECUTION_ENABLED");
  if (process.env.STELLAR_NETWORK?.toLowerCase().includes("main") || process.env.STELLAR_NETWORK === "public") {
    blocked("STELLAR_MAINNET_FORBIDDEN");
  }
}

function keySecret(name: string): string {
  const value = execFileSync("stellar", ["keys", "secret", name], { encoding: "utf8" }).trim();
  deny(value);
  return value;
}

function keyPublic(name: string): string {
  return execFileSync("stellar", ["keys", "public-key", name], { encoding: "utf8" }).trim();
}

async function nativeBalance(publicKey: string): Promise<string | null> {
  const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
  if (response.status === 404) return null;
  if (!response.ok) blocked("HORIZON_UNAVAILABLE", { status: response.status });
  const body = (await response.json()) as { balances?: { asset_type: string; balance: string }[] };
  return body.balances?.find((row) => row.asset_type === "native")?.balance ?? "0";
}

async function main() {
  assertIsolatedDatabase();
  const redemptionId: string = REDEMPTION_ID;
  if (redemptionId === HISTORICAL) blocked("HISTORICAL_REDEMPTION_FORBIDDEN");
  const prisma = createPrismaClient(process.env.DATABASE_URL);
  const writes: { operation: string; signer: string; transactionHash: string; ledger: number }[] = [];
  try {
    const table = await prisma.$queryRaw<Array<{ name: string | null }>>`
      SELECT to_regclass('"EconomicChainEvidence"')::text AS name
    `;
    if (!table[0]?.name) blocked("EVIDENCE_TABLE_MISSING");
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at
    `;
    const applied = migrations.map((row) => row.migration_name);
    if (!applied.includes("20261004120000_economic_chain_evidence")) blocked("EVIDENCE_MIGRATION_MISSING", { applied });
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'EconomicChainEvidence'
    `;

    const stellarBefore = {
      network: process.env.STELLAR_NETWORK ?? null,
      contract: process.env.MOC_FAN_ECONOMY_CONTRACT_ID ?? null,
      trust: process.env.MOC_TRUST_EXECUTION ?? null,
    };
    if (stellarBefore.network || stellarBefore.contract) blocked("STELLAR_ENV_SET_BEFORE_FIXTURE");

    await prisma.actor.upsert({ where: { actorRef: ARTIST }, update: {}, create: { actorRef: ARTIST } });
    await prisma.actor.upsert({ where: { actorRef: FAN }, update: {}, create: { actorRef: FAN } });
    const work = await prisma.musicalWork.create({
      data: { actorRef: ARTIST, title: "hackathon-2026-10-04" },
    });
    const release = await prisma.musicRelease.create({
      data: {
        workId: work.id,
        actorRef: ARTIST,
        title: "hackathon-2026-10-04",
        releaseType: "single",
        language: "es",
        primaryGenre: "pop",
      },
    });
    const participation = await prisma.participation.create({
      data: {
        releaseId: release.id,
        displayName: "Artista",
        actorRef: ARTIST,
        role: "performer",
        revenueSharePercent: 100,
      },
    });
    const campaign = await createCampaign(
      { artistActorRef: ARTIST, title: "hackathon-2026-10-04", committed: { units: AUTHORIZED, ...USDC } },
      prisma
    );
    const mission = await createMission(
      {
        artistActorRef: ARTIST,
        campaignId: campaign.id,
        title: "hackathon-2026-10-04",
        criterion: "Certificación controlada",
        maximumReward: { units: AUTHORIZED, ...USDC },
        assignmentMode: "fan-accept",
      },
      prisma
    );
    const assignment = await acceptMission({ fanActorRef: FAN, missionId: mission.id }, prisma);
    const evidence = await submitEvidence(
      { fanActorRef: FAN, assignmentId: assignment.id, statement: "hackathon-2026-10-04" },
      prisma
    );
    await recordVerification(
      { verifierActorRef: ARTIST, assignmentId: assignment.id, evidenceId: evidence.id, outcome: "accepted" },
      prisma
    );
    const reward = await authorizeReward(
      { artistActorRef: ARTIST, assignmentId: assignment.id, amount: { units: AUTHORIZED, ...USDC } },
      prisma
    );
    const redeemed = await redeemReward(
      {
        fanActorRef: FAN,
        rewardEntitlementId: reward.id,
        amount: { units: REDEEMED, ...USDC },
        redemptionId: REDEMPTION_ID,
        releaseId: release.id,
      },
      prisma
    );
    const assessed = await createPrismaEconomicsStore(prisma, { joined: true }).getRevenue(redeemed.revenueId);
    if (!assessed || assessed.entitlements.length === 0) blocked("CANONICAL_RECORDS_MISSING");
    if (assessed.revenue.origin.kind !== "redemption" || assessed.revenue.origin.id !== REDEMPTION_ID) {
      blocked("REVENUE_ORIGIN_MISMATCH");
    }
    const commitments = canonicalCommitments({
      redemptionId: REDEMPTION_ID,
      revenueId: assessed.revenue.revenueId,
      shares: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
    });
    const expectedTarget = hex32(releaseHash(release.id));
    const expectedGrant = hex32(assignmentHash(assignment.id));
    const expectedCampaign = hex32(campaignHash(campaign.id));
    const expectedAsset = hex32(assetHash(USDC.asset));
    const fanActorHash = hex32(actorHash(FAN));
    const artistActorHash = hex32(actorHash(ARTIST));
    if (!commitments.redemptionHash || !commitments.revenueHash || !commitments.distributionHash || !commitments.materializationHash) {
      blocked("CANONICAL_HASH_MISSING");
    }

    const artistCli = keyPublic("moc-testnet-artist");
    const fanCli = keyPublic("moc-testnet-fan");
    const materializerCli = keyPublic("moc-testnet-materializer");
    if (artistCli !== ARTIST_PUBLIC || fanCli !== FAN_PUBLIC || materializerCli !== MATERIALIZER_PUBLIC) {
      blocked("KEYSTORE_PUBLIC_KEY_MISMATCH");
    }
    const artist = keypairFromSecret(keySecret("moc-testnet-artist"), ARTIST_PUBLIC);
    const fan = keypairFromSecret(keySecret("moc-testnet-fan"), FAN_PUBLIC);
    const materializer = keypairFromSecret(keySecret("moc-testnet-materializer"), MATERIALIZER_PUBLIC);

    const chain: SorobanMaterializationClient = createSorobanMaterializationClient({
      contractId: CONTRACT,
      rpcUrl: RPC,
      network: "testnet",
      materializer,
      capability: fan,
      authority: artist,
    });
    const fanCapability = await chain.readActorCapability(FAN);
    const artistCapability = await chain.readActorCapability(ARTIST);
    if (fanCapability !== FAN_PUBLIC || artistCapability !== ARTIST_PUBLIC) {
      blocked("CAPABILITY_BINDING_MISMATCH", {
        fanCapability,
        artistCapability,
      });
    }
    const campaignState = await chain.readCampaign(campaign.id);
    const rewardState = await chain.readReward(assignment.id);
    const redemptionState = await chain.getRedemption(REDEMPTION_ID);
    const historicalBefore = await chain.getRedemption(HISTORICAL);
    if (!historicalBefore) blocked("CONTRACT_REDEMPTION_UNREADABLE");

    const operations: { operation: string; signer: string; expected: string }[] = [];
    if (!campaignState) {
      operations.push({
        operation: "commit_reserve",
        signer: ARTIST_PUBLIC,
        expected: "campaña ausente → reserva comprometida 5000000 USDC escala 6",
      });
    } else if (
      campaignState.committed !== AUTHORIZED.toString() ||
      campaignState.authorityActor !== artistActorHash ||
      campaignState.assetHash !== expectedAsset ||
      campaignState.scale !== String(USDC.scale)
    ) {
      blocked("CAMPAIGN_PAYLOAD_MISMATCH", { campaignState });
    }
    if (!rewardState) {
      operations.push({
        operation: "authorize_reward",
        signer: ARTIST_PUBLIC,
        expected: "otorgamiento ausente → autorizado 5000000 al actor fan",
      });
    } else if (
      rewardState.authorized !== AUTHORIZED.toString() ||
      rewardState.actorHash !== fanActorHash ||
      rewardState.campaignId !== expectedCampaign
    ) {
      blocked("GRANT_PAYLOAD_MISMATCH", { rewardState });
    }
    if (!redemptionState) {
      operations.push({
        operation: "redeem",
        signer: FAN_PUBLIC,
        expected: "canje ausente → COMMITTED",
      });
    } else if (
      redemptionState.status !== "committed" && redemptionState.status !== "locked"
    ) {
      blocked("REDEMPTION_STATE_UNEXPECTED", { redemptionState });
    } else if (
      redemptionState.amount !== REDEEMED.toString() ||
      redemptionState.targetHash !== expectedTarget ||
      redemptionState.distributionHash !== commitments.distributionHash ||
      redemptionState.grantId !== expectedGrant
    ) {
      blocked("REDEMPTION_PAYLOAD_MISMATCH", { redemptionState });
    }
    if (redemptionState?.status !== "locked") {
      operations.push({
        operation: "lock_redemption",
        signer: MATERIALIZER_PUBLIC,
        expected: "COMMITTED → LOCKED con el hash de materialización canónico",
      });
    }
    if (operations.length === 0) blocked("NOTHING_TO_CERTIFY");

    const manifest = {
      phase: "pre-write-manifest",
      database: {
        host: "127.0.0.1",
        name: "moc_s3_cert",
        evidenceTable: true,
        migrations: applied,
      },
      fanActorRef: FAN,
      artistActorRef: ARTIST,
      fanActorHash,
      artistActorHash,
      releaseId: release.id,
      campaignId: campaign.id,
      assignmentId: assignment.id,
      rewardId: reward.id,
      redemptionId: REDEMPTION_ID,
      revenueId: assessed.revenue.revenueId,
      entitlementIds: assessed.entitlements.map((row) => row.entitlementId),
      amount: { authorized: AUTHORIZED.toString(), redeemed: REDEEMED.toString(), asset: "USDC", scale: 6 },
      distribution: {
        participants: assessed.entitlements.map((row) => ({ actorRef: row.actorRef, shareBps: row.shareBps })),
        participationId: participation.id,
        distributionHash: commitments.distributionHash,
      },
      hashes: {
        redemption: commitments.redemptionHash,
        revenue: commitments.revenueHash,
        target: expectedTarget,
        distribution: commitments.distributionHash,
        materialization: commitments.materializationHash,
        campaign: expectedCampaign,
        grant: expectedGrant,
        asset: expectedAsset,
      },
      stellar: {
        network: "testnet",
        contractId: CONTRACT,
        fanCapability: FAN_PUBLIC,
        artistCapability: ARTIST_PUBLIC,
        materializer: MATERIALIZER_PUBLIC,
        rpc: RPC,
      },
      revenueExists: true,
      entitlementExists: true,
      chainBefore: { campaignState, rewardState, redemptionState, historicalBefore },
      operations,
      indexes: indexes.map((row) => row.indexname),
    };
    emit(manifest);

    for (const publicKey of [ARTIST_PUBLIC, FAN_PUBLIC, MATERIALIZER_PUBLIC]) {
      const balance = await nativeBalance(publicKey);
      if (balance == null || Number(balance) < 1) {
        const funded = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
        if (!funded.ok) blocked("TESTNET_ACCOUNT_UNFUNDED", { publicKey, status: funded.status });
      }
    }

    if (!campaignState) {
      const receipt = await chain.commitReserve({
        campaignId: campaign.id,
        authorityActorRef: ARTIST,
        asset: USDC.asset,
        scale: USDC.scale,
        amount: AUTHORIZED.toString(),
      });
      writes.push({ operation: "commit_reserve", signer: ARTIST_PUBLIC, ...receipt });
      const committed = await chain.readCampaign(campaign.id);
      if (!committed || committed.committed !== AUTHORIZED.toString() || committed.outstanding !== "0") {
        blocked("COMMIT_RESERVE_STATE_MISMATCH", { writes, committed });
      }
    }
    if (!rewardState) {
      const receipt = await chain.authorizeReward({
        assignmentId: assignment.id,
        campaignId: campaign.id,
        fanActorRef: FAN,
        amount: AUTHORIZED.toString(),
      });
      writes.push({ operation: "authorize_reward", signer: ARTIST_PUBLIC, ...receipt });
      const granted = await chain.readReward(assignment.id);
      if (!granted || granted.authorized !== AUTHORIZED.toString() || granted.consumed !== "0" || granted.actorHash !== fanActorHash) {
        blocked("AUTHORIZE_REWARD_STATE_MISMATCH", { writes, granted });
      }
    }

    const beforeRedeem = await chain.getRedemption(REDEMPTION_ID);
    let redeemTx: { transactionHash: string; ledger: number } | null = null;
    if (!beforeRedeem) {
      if (!chain.redeemControlled) blocked("FAN_CAPABILITY_MISSING", { writes });
      const receipt = await chain.redeemControlled({
        redemptionId: REDEMPTION_ID,
        assignmentId: assignment.id,
        amount: REDEEMED.toString(),
        releaseId: release.id,
        distributionHash: commitments.distributionHash,
      });
      redeemTx = { transactionHash: receipt.transactionHash, ledger: receipt.ledger };
      writes.push({ operation: "redeem", signer: FAN_PUBLIC, transactionHash: receipt.transactionHash, ledger: receipt.ledger });
    }
    const committedRedemption = await chain.getRedemption(REDEMPTION_ID);
    if (
      !committedRedemption ||
      (committedRedemption.status !== "committed" && committedRedemption.status !== "locked") ||
      committedRedemption.amount !== REDEEMED.toString() ||
      committedRedemption.targetHash !== expectedTarget ||
      committedRedemption.distributionHash !== commitments.distributionHash ||
      committedRedemption.grantId !== expectedGrant
    ) {
      blocked("REDEEM_CERTIFICATION_FAILED", { writes, committedRedemption });
    }
    if (committedRedemption.status !== "committed" && committedRedemption.status !== "locked") {
      blocked("REDEEM_NOT_COMMITTED", { writes, committedRedemption });
    }

    const economicBefore = await snapshot(prisma, reward.id, assessed.revenue.revenueId);
    let lockCalls = 0;
    const observed = {
      ...chain,
      async lockRedemption(input: { redemptionId: string; revenueId: string; distributionHash: string }) {
        lockCalls += 1;
        return chain.lockRedemption(input);
      },
    };
    process.env.STELLAR_NETWORK = "testnet";
    process.env.STELLAR_RPC_URL = RPC;
    process.env.MOC_FAN_ECONOMY_CONTRACT_ID = CONTRACT;
    process.env.MOC_MATERIALIZER_PUBLIC_KEY = MATERIALIZER_PUBLIC;

    if (committedRedemption.status === "committed") {
      const proof = await materializeRedemption(
        { redemptionId: REDEMPTION_ID, fanActorRef: FAN },
        { client: prisma, chain: observed, network: "testnet", contractId: CONTRACT, controlledActorRef: FAN }
      );
      if (lockCalls !== 1 || proof.verification !== "verified" || proof.publicationState !== "confirmed") {
        blocked("LOCK_CERTIFICATION_FAILED", { writes, lockCalls, proof });
      }
      writes.push({
        operation: "lock_redemption",
        signer: MATERIALIZER_PUBLIC,
        transactionHash: proof.transactionHash ?? "",
        ledger: proof.ledger ?? 0,
      });
    }

    const locked = await chain.getRedemption(REDEMPTION_ID);
    if (!locked || locked.status !== "locked" || locked.materializationHash !== commitments.materializationHash) {
      blocked("MATERIALIZATION_HASH_MISMATCH", { writes, locked, expected: commitments.materializationHash });
    }
    const locksAfterFirst = lockCalls;
    const evidenceBeforeRetry = await prisma.economicChainEvidence.findUnique({
      where: { revenueId: assessed.revenue.revenueId },
    });
    const retry = await materializeRedemption(
      { redemptionId: REDEMPTION_ID, fanActorRef: FAN },
      { client: prisma, chain: observed, network: "testnet", contractId: CONTRACT, controlledActorRef: FAN }
    );
    const evidenceAfterRetry = await prisma.economicChainEvidence.findUnique({
      where: { revenueId: assessed.revenue.revenueId },
    });
    const anotherLock = lockCalls !== locksAfterFirst;
    if (anotherLock || retry.transactionHash !== evidenceBeforeRetry?.transactionHash) {
      blocked("IDEMPOTENCY_FAILED", { writes, lockCalls, locksAfterFirst, retry });
    }

    const conflict = decidePublication({
      evidence: { state: "pending", transactionHash: null },
      chain: {
        status: "locked",
        grantId: expectedGrant,
        amount: REDEEMED.toString(),
        targetHash: expectedTarget,
        distributionHash: "ab".repeat(32),
        materializationHash: "cd".repeat(32),
      },
      expectedMaterializationHash: commitments.materializationHash,
      expectedDistributionHash: commitments.distributionHash,
      expectedAmount: REDEEMED.toString(),
      expectedTargetHash: expectedTarget,
      controlledRedeem: false,
    });
    if (conflict.kind !== "payload-conflict") blocked("PAYLOAD_CONFLICT_DECISION_FAILED", { conflict });
    const evidenceAfterConflictDecision = await prisma.economicChainEvidence.findUnique({
      where: { revenueId: assessed.revenue.revenueId },
    });
    if (
      evidenceAfterConflictDecision?.state !== "confirmed" ||
      evidenceAfterConflictDecision.transactionHash !== evidenceAfterRetry?.transactionHash ||
      evidenceAfterConflictDecision.materializationHash !== commitments.materializationHash
    ) {
      blocked("CONFIRMED_EVIDENCE_OVERWRITTEN", { writes });
    }

    const verification = await readRedemptionProof({ redemptionId: REDEMPTION_ID, fanActorRef: FAN }, prisma, process.env);
    if (!("verification" in verification) || verification.verification !== "verified") {
      blocked("VERIFICATION_FAILED", { writes, verification });
    }
    const economicAfter = await snapshot(prisma, reward.id, assessed.revenue.revenueId);
    const consistent = JSON.stringify(economicBefore) === JSON.stringify(economicAfter);
    const historicalAfter = await chain.getRedemption(HISTORICAL);
    const presentation = publicationPresentation(
      "verification" in verification
        ? {
            economicRecord: verification.economicRecord,
            verification: verification.verification,
            publicationState: verification.publicationState,
            contractStatus: verification.contractStatus,
            network: verification.network,
            contractId: verification.contractId,
            transactionHash: verification.transactionHash,
            ledger: verification.ledger,
          }
        : null
    );
    const lockWrite = writes.find((row) => row.operation === "lock_redemption");
    const redeemWrite = writes.find((row) => row.operation === "redeem");
    emit({
      status: consistent && presentation === "published" ? "CANONICAL_TESTNET_MATERIALIZATION_CERTIFIED" : "CANONICAL_TESTNET_MATERIALIZATION_BLOCKED",
      writes,
      redeem: redeemWrite ?? { note: "already committed before this run" },
      redeemState: "committed",
      lock: lockWrite,
      lockState: locked.status,
      expectedMaterializationHash: commitments.materializationHash,
      actualMaterializationHash: locked.materializationHash,
      evidence: evidenceAfterRetry,
      idempotency: { anotherTransactionSubmitted: anotherLock, lockCalls, verification: retry.verification },
      verification,
      presentation,
      databaseConsistency: consistent,
      historicalUnchanged: JSON.stringify(historicalBefore) === JSON.stringify(historicalAfter),
      readable: {
        registroEconomico: "Creado",
        evidenciaStellar: verification.verification === "verified" ? "Verificada" : verification.verification,
        red: "Stellar Testnet",
        monto: "1 USDC",
        unidades: REDEEMED.toString(),
        escala: 6,
        contrato: CONTRACT,
        transaccion: lockWrite?.transactionHash ?? evidenceAfterRetry?.transactionHash,
        ledger: lockWrite?.ledger ?? evidenceAfterRetry?.ledger,
        estado: "LOCKED",
        explorerTx: `https://stellar.expert/explorer/testnet/tx/${lockWrite?.transactionHash ?? evidenceAfterRetry?.transactionHash}`,
        explorerContract: `https://stellar.expert/explorer/testnet/contract/${CONTRACT}`,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function snapshot(prisma: ReturnType<typeof createPrismaClient>, rewardId: string, revenueId: string) {
  const redemption = await prisma.redemption.findUnique({ where: { id: REDEMPTION_ID } });
  const revenue = await prisma.economicRevenue.findUnique({ where: { id: revenueId } });
  const entitlements = await prisma.economicEntitlement.findMany({
    where: { revenueId },
    orderBy: { id: "asc" },
    select: { id: true, actorRef: true, units: true, shareBps: true, asset: true, scale: true, status: true, sourceKind: true },
  });
  const reward = await prisma.rewardEntitlement.findUnique({
    where: { id: rewardId },
    select: { id: true, authorizedUnits: true, consumedUnits: true, releasedUnits: true, asset: true, scale: true },
  });
  return {
    redemption: redemption && {
      id: redemption.id,
      units: redemption.units,
      asset: redemption.asset,
      scale: redemption.scale,
      state: redemption.state,
      revenueId: redemption.revenueId,
      releaseId: redemption.releaseId,
      fanActorRef: redemption.fanActorRef,
      payloadHash: redemption.payloadHash,
    },
    revenue: revenue && {
      id: revenue.id,
      originKind: revenue.originKind,
      originId: revenue.originId,
      grossUnits: revenue.grossUnits,
      netUnits: revenue.netUnits,
      protocolFeeUnits: revenue.protocolFeeUnits,
      asset: revenue.asset,
      scale: revenue.scale,
      status: revenue.status,
      policyId: revenue.policyId,
    },
    entitlements,
    reward,
  };
}

main().catch((error: unknown) => {
  if (error instanceof Error && error.message === "BLOCKED") {
    process.exitCode = 2;
    return;
  }
  const code = error instanceof Error ? error.message : "FAILED";
  if (/S[A-Z2-7]{55}/.test(code)) {
    emit({ status: "CANONICAL_TESTNET_MATERIALIZATION_BLOCKED", reason: "SECRET_LEAK" });
  } else {
    emit({ status: "CANONICAL_TESTNET_MATERIALIZATION_BLOCKED", reason: code });
  }
  process.exitCode = 2;
});
