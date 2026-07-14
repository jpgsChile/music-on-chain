import type { ChainRef, TransactionRef } from "./types";

/** Order settlement — create intent + verify payment (primary BAL port for Marketplace). */
export interface ISettlementAdapter {
  createSettlementIntent?(request: unknown): Promise<unknown>;
  verifySettlement?(request: {
    intentId: string;
    orderId: string;
    transactionRef: TransactionRef;
  }): Promise<{ verified: boolean }>;
  getSupportedRails?(chainRef: ChainRef): Promise<unknown[]>;
}
