import type { ChainRef } from "./types";

/** On-chain royalty registration / quotes (EIP-2981-like). Domain still owns split math. */
export interface IRoyaltyAdapter {
  getChainRef(): ChainRef;
  registerSchedule?(request: unknown): Promise<unknown>;
  getRoyaltyQuote?(request: unknown): Promise<unknown>;
}
