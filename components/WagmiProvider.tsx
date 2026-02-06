"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { baseSepolia } from "viem/chains";
import { config } from "@/lib/wagmi";
import { useState } from "react";

const privyConfig = {
  loginMethods: ["google", "passkey"] as ("google" | "passkey")[],
  appearance: { theme: "dark" as const },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets" as const,
    },
  },
  defaultChain: baseSepolia,
  supportedChains: [baseSepolia],
};

type Props = { children: React.ReactNode };

export default function WagmiProviderWrapper(props: Props) {
  const { children } = props;
  const [queryClient] = useState(() => new QueryClient());
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}











