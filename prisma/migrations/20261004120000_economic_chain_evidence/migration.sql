-- Evidence of a Stellar materialization. Not a column on EconomicRevenue and not a settlement receipt.

CREATE TABLE "EconomicChainEvidence" (
    "id" TEXT NOT NULL,
    "redemptionId" TEXT NOT NULL,
    "revenueId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "transactionHash" TEXT,
    "ledger" INTEGER,
    "materializationHash" TEXT,
    "state" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "EconomicChainEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EconomicChainEvidence_revenueId_key" ON "EconomicChainEvidence"("revenueId");

CREATE INDEX "EconomicChainEvidence_redemptionId_idx" ON "EconomicChainEvidence"("redemptionId");

CREATE UNIQUE INDEX "EconomicChainEvidence_network_contractId_redemptionId_key" ON "EconomicChainEvidence"("network", "contractId", "redemptionId");

ALTER TABLE "EconomicChainEvidence" ADD CONSTRAINT "EconomicChainEvidence_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
