-- PostgreSQL baseline generated from prisma/schema.prisma.
-- The previous SQLite migration is archived and is not applied here.
-- Empty production database. Local prisma/dev.db is not copied.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ArtistProfile" (
    "id" TEXT NOT NULL,
    "actorRef" TEXT,
    "wallet" TEXT,
    "artisticName" TEXT NOT NULL,
    "country" TEXT,
    "username" TEXT,
    "biography" TEXT,
    "bannerUrl" TEXT,
    "avatarUrl" TEXT,
    "socials" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "creativeRoles" JSONB,
    "defaultRoyaltySplits" JSONB,
    "attestationHash" TEXT,
    "attestationChainId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actor" (
    "actorRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("actorRef")
);

-- CreateTable
CREATE TABLE "ActorWallet" (
    "id" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActorWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityBinding" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicalWork" (
    "id" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicalWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicRelease" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "releaseType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "primaryGenre" TEXT NOT NULL,
    "secondaryGenre" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "soloCreator" BOOLEAN NOT NULL DEFAULT true,
    "pricingModels" TEXT NOT NULL DEFAULT '[]',
    "priceUsdc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "network" TEXT NOT NULL DEFAULT 'base',
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "tokenId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicTrack" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '',
    "durationSec" INTEGER,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "lyrics" TEXT NOT NULL DEFAULT '',
    "previewUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MusicTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "actorRef" TEXT,
    "role" TEXT NOT NULL,
    "revenueSharePercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationInvite" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdByActorRef" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicRevenue" (
    "id" TEXT NOT NULL,
    "originKind" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "saleId" TEXT,
    "workId" TEXT,
    "releaseId" TEXT,
    "grossUnits" TEXT NOT NULL,
    "protocolFeeUnits" TEXT NOT NULL,
    "convenienceFeeUnits" TEXT NOT NULL,
    "netUnits" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "protocolFeeBps" INTEGER NOT NULL DEFAULT 0,
    "convenienceFeeBps" INTEGER NOT NULL DEFAULT 0,
    "ruleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomicRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicEntitlement" (
    "id" TEXT NOT NULL,
    "revenueId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "shareBps" INTEGER NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "EconomicEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicSettlement" (
    "id" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "executionLayer" TEXT NOT NULL,
    "destinationWallet" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicPayment" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRight" (
    "id" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "objectKind" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainRight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementIntent" (
    "id" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActorSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRequestRecord" (
    "id" TEXT NOT NULL,
    "intentRef" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "destinationCapability" TEXT,
    "units" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionRequestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementReceiptRecord" (
    "id" TEXT NOT NULL,
    "intentRef" TEXT NOT NULL,
    "requestRef" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalRef" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "SettlementReceiptRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "artistActorRef" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "committedUnits" TEXT NOT NULL,
    "reserveKind" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "maximumRewardUnits" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "assignmentMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAssignment" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "fanActorRef" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "submitterActorRef" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "verifierActorRef" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardEntitlement" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "fanActorRef" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "authorizedUnits" TEXT NOT NULL,
    "consumedUnits" TEXT NOT NULL,
    "releasedUnits" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "rewardEntitlementId" TEXT NOT NULL,
    "fanActorRef" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "revenueId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardReleaseCommand" (
    "id" TEXT NOT NULL,
    "rewardEntitlementId" TEXT NOT NULL,
    "fanActorRef" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardReleaseCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanEconomyTransition" (
    "id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "priorState" TEXT NOT NULL,
    "nextState" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanEconomyTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistProfile_actorRef_key" ON "ArtistProfile"("actorRef");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistProfile_wallet_key" ON "ArtistProfile"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "ActorWallet_address_key" ON "ActorWallet"("address");

-- CreateIndex
CREATE INDEX "ActorWallet_actorRef_idx" ON "ActorWallet"("actorRef");

-- CreateIndex
CREATE INDEX "IdentityBinding_actorRef_status_idx" ON "IdentityBinding"("actorRef", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityBinding_issuer_subject_key" ON "IdentityBinding"("issuer", "subject");

-- CreateIndex
CREATE INDEX "MusicalWork_actorRef_idx" ON "MusicalWork"("actorRef");

-- CreateIndex
CREATE INDEX "MusicRelease_actorRef_idx" ON "MusicRelease"("actorRef");

-- CreateIndex
CREATE INDEX "MusicRelease_workId_idx" ON "MusicRelease"("workId");

-- CreateIndex
CREATE INDEX "Participation_releaseId_idx" ON "Participation"("releaseId");

-- CreateIndex
CREATE INDEX "Participation_actorRef_idx" ON "Participation"("actorRef");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationInvite_participationId_key" ON "ParticipationInvite"("participationId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationInvite_tokenHash_key" ON "ParticipationInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ParticipationInvite_tokenHash_idx" ON "ParticipationInvite"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicRevenue_originKind_originId_key" ON "EconomicRevenue"("originKind", "originId");

-- CreateIndex
CREATE INDEX "EconomicEntitlement_actorRef_idx" ON "EconomicEntitlement"("actorRef");

-- CreateIndex
CREATE INDEX "EconomicEntitlement_revenueId_idx" ON "EconomicEntitlement"("revenueId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicSettlement_entitlementId_key" ON "EconomicSettlement"("entitlementId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicPayment_settlementId_key" ON "EconomicPayment"("settlementId");

-- CreateIndex
CREATE INDEX "DomainRight_actorRef_idx" ON "DomainRight"("actorRef");

-- CreateIndex
CREATE INDEX "DomainRight_objectKind_objectId_idx" ON "DomainRight"("objectKind", "objectId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementIntent_entitlementId_key" ON "SettlementIntent"("entitlementId");

-- CreateIndex
CREATE INDEX "SettlementIntent_actorRef_idx" ON "SettlementIntent"("actorRef");

-- CreateIndex
CREATE UNIQUE INDEX "ActorSession_tokenHash_key" ON "ActorSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ActorSession_actorRef_idx" ON "ActorSession"("actorRef");

-- CreateIndex
CREATE INDEX "ActorSession_issuer_subject_idx" ON "ActorSession"("issuer", "subject");

-- CreateIndex
CREATE INDEX "ExecutionRequestRecord_intentRef_idx" ON "ExecutionRequestRecord"("intentRef");

-- CreateIndex
CREATE INDEX "SettlementReceiptRecord_intentRef_idx" ON "SettlementReceiptRecord"("intentRef");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementReceiptRecord_intentRef_requestRef_key" ON "SettlementReceiptRecord"("intentRef", "requestRef");

-- CreateIndex
CREATE INDEX "Campaign_artistActorRef_idx" ON "Campaign"("artistActorRef");

-- CreateIndex
CREATE INDEX "Mission_campaignId_idx" ON "Mission"("campaignId");

-- CreateIndex
CREATE INDEX "MissionAssignment_missionId_idx" ON "MissionAssignment"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionAssignment_fanActorRef_missionId_key" ON "MissionAssignment"("fanActorRef", "missionId");

-- CreateIndex
CREATE INDEX "EvidenceRecord_assignmentId_idx" ON "EvidenceRecord"("assignmentId");

-- CreateIndex
CREATE INDEX "VerificationRecord_assignmentId_current_idx" ON "VerificationRecord"("assignmentId", "current");

-- CreateIndex
CREATE UNIQUE INDEX "RewardEntitlement_assignmentId_key" ON "RewardEntitlement"("assignmentId");

-- CreateIndex
CREATE INDEX "RewardEntitlement_campaignId_idx" ON "RewardEntitlement"("campaignId");

-- CreateIndex
CREATE INDEX "RewardEntitlement_fanActorRef_idx" ON "RewardEntitlement"("fanActorRef");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_revenueId_key" ON "Redemption"("revenueId");

-- CreateIndex
CREATE INDEX "Redemption_fanActorRef_idx" ON "Redemption"("fanActorRef");

-- CreateIndex
CREATE INDEX "Redemption_rewardEntitlementId_idx" ON "Redemption"("rewardEntitlementId");

-- CreateIndex
CREATE INDEX "FanEconomyTransition_subjectId_idx" ON "FanEconomyTransition"("subjectId");

-- AddForeignKey
ALTER TABLE "ArtistProfile" ADD CONSTRAINT "ArtistProfile_actorRef_fkey" FOREIGN KEY ("actorRef") REFERENCES "Actor"("actorRef") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorWallet" ADD CONSTRAINT "ActorWallet_actorRef_fkey" FOREIGN KEY ("actorRef") REFERENCES "Actor"("actorRef") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityBinding" ADD CONSTRAINT "IdentityBinding_actorRef_fkey" FOREIGN KEY ("actorRef") REFERENCES "Actor"("actorRef") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicRelease" ADD CONSTRAINT "MusicRelease_workId_fkey" FOREIGN KEY ("workId") REFERENCES "MusicalWork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicRelease" ADD CONSTRAINT "MusicRelease_actorRef_fkey" FOREIGN KEY ("actorRef") REFERENCES "Actor"("actorRef") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "MusicRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "MusicRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationInvite" ADD CONSTRAINT "ParticipationInvite_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicEntitlement" ADD CONSTRAINT "EconomicEntitlement_revenueId_fkey" FOREIGN KEY ("revenueId") REFERENCES "EconomicRevenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicSettlement" ADD CONSTRAINT "EconomicSettlement_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "EconomicEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomicPayment" ADD CONSTRAINT "EconomicPayment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "EconomicSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAssignment" ADD CONSTRAINT "MissionAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MissionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MissionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEntitlement" ADD CONSTRAINT "RewardEntitlement_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MissionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardEntitlementId_fkey" FOREIGN KEY ("rewardEntitlementId") REFERENCES "RewardEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardReleaseCommand" ADD CONSTRAINT "RewardReleaseCommand_rewardEntitlementId_fkey" FOREIGN KEY ("rewardEntitlementId") REFERENCES "RewardEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
