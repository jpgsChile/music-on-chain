import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { avalancheFuji } from "viem/chains";

export const config = createConfig({
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http(),
  },
  connectors: [],
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

