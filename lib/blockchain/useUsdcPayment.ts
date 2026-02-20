"use client";

import { useWallets } from "@privy-io/react-auth";
import { getAddress, parseEther, toHex } from "viem";
import { avalancheFuji } from "viem/chains";

type PayWithNativeArgs = {
  /** Recipient address (Avalanche Fuji). Will be normalized with getAddress for EIP-55 checksum. */
  to: string;
  amount: number;
};

export function useNativePayment() {
  const { wallets } = useWallets();

  const payWithNative = async ({ to, amount }: PayWithNativeArgs) => {
    const wallet = wallets[0];
    if (!wallet) {
      throw new Error("No wallet");
    }
    if (!to?.trim()) {
      throw new Error(
        "Recipient address is missing. Configure the artist wallet in .env.local (Avalanche Fuji) and refresh the page."
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const recipient = getAddress(to);
    const provider = await wallet.getEthereumProvider();
    const amountInWei = parseEther(amount.toString());

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: wallet.address,
          to: recipient,
          value: toHex(amountInWei),
          chainId: avalancheFuji.id,
        },
      ],
    });

    return txHash as string;
  };

  return { payWithNative };
}

// Backward-compatible alias while migrating imports.
export const useUsdcPayment = useNativePayment;
