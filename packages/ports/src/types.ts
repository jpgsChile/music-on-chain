/** Opaque chain identifier, e.g. "base-mainnet". */
export type ChainRef = string;

/** Opaque account reference (not necessarily a hex address at domain boundary). */
export type AccountRef = string;

export type TransactionRef = {
  chainRef: ChainRef;
  hash: string;
};
