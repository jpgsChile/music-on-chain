"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { config, appChain } from "@/lib/wagmi";
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
  defaultChain: appChain,
  supportedChains: [appChain],
} as PrivyClientConfig;

type Props = { children: React.ReactNode };

/** Privy app IDs look like cuid strings (e.g. clxxxxxx...). Reject empty/placeholders. */
function isValidPrivyAppId(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === "your_privy_app_id") return false;
  if (trimmed.includes(" ")) return false;
  // Real Privy app IDs are typically 25+ chars alphanumeric starting with "cl"
  if (trimmed.length < 20) return false;
  return true;
}

function MissingPrivyConfig({ appId }: { appId: string | undefined }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-lg w-full border border-border rounded-2xl p-8 bg-border/10 space-y-4">
        <h1 className="text-xl font-bold">Falta configurar Privy</h1>
        <p className="text-sm text-foreground/70">
          La app no puede iniciar porque{" "}
          <code className="text-accent">NEXT_PUBLIC_PRIVY_APP_ID</code> no está
          definido o no es válido
          {appId ? (
            <>
              {" "}
              (valor actual: <code className="text-foreground/90">{appId}</code>).
            </>
          ) : (
            "."
          )}
        </p>
        <ol className="text-sm text-foreground/80 list-decimal list-inside space-y-2">
          <li>
            Crea una app en{" "}
            <a
              href="https://dashboard.privy.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              dashboard.privy.io
            </a>
          </li>
          <li>
            Copia el <strong>App ID</strong>
          </li>
          <li>
            En la raíz del proyecto, crea{" "}
            <code className="text-accent">.env.local</code>:
          </li>
        </ol>
        <pre className="text-xs bg-background border border-border rounded-lg p-4 overflow-x-auto font-mono text-foreground/90">
{`NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxx
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_CLEAVER_WALLET=0xYourAddress
NEXT_PUBLIC_SOU_WALLET=0xYourAddress`}
        </pre>
        <p className="text-xs text-foreground/50">
          Reinicia <code>npm run dev</code> después de guardar{" "}
          <code>.env.local</code>.
        </p>
      </div>
    </div>
  );
}

export default function WagmiProviderWrapper(props: Props) {
  const { children } = props;
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

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

  if (!isValidPrivyAppId(appId)) {
    return <MissingPrivyConfig appId={appId} />;
  }

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
