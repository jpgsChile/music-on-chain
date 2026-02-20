"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { avalancheFuji } from "viem/chains";
import { config } from "@/lib/wagmi";
import { useState, useEffect } from "react";

const privyConfig = {
  loginMethods: ["wallet", "google", "email", "passkey"],
  appearance: {
    theme: "dark",
    walletList: [
      "core",
      "coinbase_wallet",
      "base_account",
      "metamask",
      "wallet_connect_qr",
      "detected_ethereum_wallets",
    ],
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  defaultChain: avalancheFuji,
  supportedChains: [avalancheFuji],
} as PrivyClientConfig;

type Props = { children: React.ReactNode };

export default function WagmiProviderWrapper(props: Props) {
  const { children } = props;
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === "undefined") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <span className="animate-pulse">Cargando…</span>
      </div>
    );
  }

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}











