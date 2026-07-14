"use client";

import { useWallets } from "@privy-io/react-auth";
import { getAddress, parseEther, toHex } from "viem";
import { appChain } from "@/lib/wagmi";

type PayWithNativeArgs = {
  /** Recipient EVM address on Base. Normalized with getAddress for EIP-55 checksum. */
  to: string;
  amount: number;
};

export function useNativePayment() {
  const { wallets } = useWallets();

  const payWithNative = async ({ to, amount }: PayWithNativeArgs) => {
    const wallet = wallets[0];
    if (!wallet) {
      throw new Error("Conecta tu cuenta para continuar.");
    }
    if (!to?.trim()) {
      throw new Error(
        "Cuenta del artista no configurada. Revisa la configuración e inténtalo de nuevo."
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Monto no válido.");
    }

    const recipient = getAddress(to);
    const provider = await wallet.getEthereumProvider();
    // Demo transfer on Base; product copy labels settlement as USDC.
    const amountInWei = parseEther(amount.toString());

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: wallet.address,
          to: recipient,
          value: toHex(amountInWei),
          chainId: appChain.id,
        },
      ],
    });

    return txHash as string;
  };

  return { payWithNative };
}

// Backward-compatible alias while migrating imports.
export const useUsdcPayment = useNativePayment;
