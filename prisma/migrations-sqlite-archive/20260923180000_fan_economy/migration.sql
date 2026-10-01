-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistActorRef" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "committedUnits" TEXT NOT NULL,
    "reserveKind" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "maximumRewardUnits" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "assignmentMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "fanActorRef" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "submitterActorRef" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MissionAssignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "verifierActorRef" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MissionAssignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardEntitlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardEntitlement_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MissionAssignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rewardEntitlementId" TEXT NOT NULL,
    "fanActorRef" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "revenueId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" DATETIME,
    CONSTRAINT "Redemption_rewardEntitlementId_fkey" FOREIGN KEY ("rewardEntitlementId") REFERENCES "RewardEntitlement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardReleaseCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rewardEntitlementId" TEXT NOT NULL,
    "fanActorRef" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "scale" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardReleaseCommand_rewardEntitlementId_fkey" FOREIGN KEY ("rewardEntitlementId") REFERENCES "RewardEntitlement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FanEconomyTransition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "command" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "priorState" TEXT NOT NULL,
    "nextState" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EconomicRevenue" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_EconomicRevenue" ("asset", "convenienceFeeBps", "convenienceFeeUnits", "createdAt", "grossUnits", "id", "netUnits", "occurredAt", "originId", "originKind", "policyId", "policyVersion", "protocolFeeBps", "protocolFeeUnits", "releaseId", "ruleId", "saleId", "scale", "workId") SELECT "asset", "convenienceFeeBps", "convenienceFeeUnits", "createdAt", "grossUnits", "id", "netUnits", "occurredAt", "originId", "originKind", "policyId", "policyVersion", "protocolFeeBps", "protocolFeeUnits", "releaseId", "ruleId", "saleId", "scale", "workId" FROM "EconomicRevenue";
DROP TABLE "EconomicRevenue";
ALTER TABLE "new_EconomicRevenue" RENAME TO "EconomicRevenue";
CREATE UNIQUE INDEX "EconomicRevenue_originKind_originId_key" ON "EconomicRevenue"("originKind", "originId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
