import type { AccountRef, ChainRef } from "./types";

/** Client-side session & signing — never used directly by Domain. */
export interface IWalletAdapter {
  connect?(options?: unknown): Promise<{ account: AccountRef; chainRef?: ChainRef }>;
  disconnect?(): Promise<void>;
  getActiveAccount?(): Promise<AccountRef | null>;
  signTransaction?(tx: unknown): Promise<unknown>;
}
