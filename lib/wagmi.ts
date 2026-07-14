import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { base, baseSepolia } from "viem/chains";

/** Base Sepolia for development; Base Mainnet when NEXT_PUBLIC_BASE_CHAIN=mainnet. */
export const appChain =
  process.env.NEXT_PUBLIC_BASE_CHAIN === "mainnet" ? base : baseSepolia;

export const config = createConfig({
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  connectors: [],
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
