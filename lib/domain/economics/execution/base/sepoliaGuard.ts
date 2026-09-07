export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_MAINNET_CHAIN_ID = 8453;

export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";

/** Minimum native ETH recommended on the executor for a controlled Sepolia proof (deploy + settle). */
export const SEPOLIA_MIN_EXECUTOR_WEI = 3_000_000_000_000_000n; // 0.003 ETH

export function assertBaseSepoliaChainId(chainId: number): void {
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    throw new Error("MAINNET_FORBIDDEN");
  }
  if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error("WRONG_CHAIN");
  }
}

export function sepoliaContractUrl(address: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/address/${address}`;
}

export function sepoliaTxUrl(hash: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`;
}
