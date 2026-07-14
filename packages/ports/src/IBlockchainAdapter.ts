import type { ChainRef, TransactionRef } from "./types";

/** Low-level chain access — one instance per ChainRef. */
export interface IBlockchainAdapter {
  getChainRef(): ChainRef;
  // TODO: Core Protocol — call, broadcast, waitForConfirmation, parseLogs
  broadcast?(signedTx: unknown): Promise<TransactionRef>;
}
