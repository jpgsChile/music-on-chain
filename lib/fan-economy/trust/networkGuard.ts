import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";

/** Only Stellar testnet may be selected. Public and mainnet fail closed. */
export function assertStellarTestnet(network: string | undefined): void {
  if ((network ?? "").trim().toLowerCase() !== "testnet") {
    throw new Error("STELLAR_MAINNET_FORBIDDEN");
  }
}

export function assertStellarTestnetRpc(rpcUrl: string): void {
  if (/mainnet|pubnet/i.test(rpcUrl)) {
    throw new Error("STELLAR_MAINNET_FORBIDDEN");
  }
}
