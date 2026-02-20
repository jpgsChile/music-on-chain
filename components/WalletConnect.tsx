"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { formatAddress } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const locale = useLocale();
  const t = getTranslations(locale);

  const isWrongNetwork = chainId !== avalancheFuji.id;

  const handleConnect = () => {
    const injectedConnector = connectors.find(
      (connector) => connector.id === "injected"
    );
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  if (isConnected) {
    return (
      <div className="flex flex-col items-end gap-2">
        {isWrongNetwork && (
          <div className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded border border-yellow-500/20">
            {t.wallet.wrongNetwork}
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground/70">
            {formatAddress(address || "")}
          </span>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-border/50 transition-colors"
          >
            {t.wallet.disconnect}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isPending}
      className="px-4 py-2 text-sm bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? t.wallet.connecting : t.wallet.connect}
    </button>
  );
}







