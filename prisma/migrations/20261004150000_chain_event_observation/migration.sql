-- Event cursor and observations. Not Revenue and not a publication proof.

CREATE TABLE "ChainEventCursor" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "lastLedger" INTEGER NOT NULL DEFAULT 0,
    "pagingToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainEventCursor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChainEventCursor_network_contractId_key" ON "ChainEventCursor"("network", "contractId");

CREATE TABLE "ChainEventObservation" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ledger" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "pagingToken" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "canonicalHash" TEXT,
    "amount" TEXT,
    "payloadHash" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChainEventObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChainEventObservation_network_contractId_pagingToken_key" ON "ChainEventObservation"("network", "contractId", "pagingToken");

CREATE INDEX "ChainEventObservation_transactionHash_idx" ON "ChainEventObservation"("transactionHash");
