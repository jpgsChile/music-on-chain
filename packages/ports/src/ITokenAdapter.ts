import type { AccountRef, ChainRef } from "./types";

/** Native / fungible token operations for a chain. */
export interface ITokenAdapter {
  getChainRef(): ChainRef;
  getBalance?(account: AccountRef, tokenRef: string): Promise<unknown>;
  // TODO: Core Protocol
}
