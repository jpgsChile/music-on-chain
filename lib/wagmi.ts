import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { baseSepolia } from "viem/chains";

export const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  connectors: [],
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

