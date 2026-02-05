"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { baseSepolia } from "viem/chains";
import { config } from "@/lib/wagmi";
import { useState } from "react";

export default function WagmiProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["google", "passkey"],
        appearance: { theme: "dark" },
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}











