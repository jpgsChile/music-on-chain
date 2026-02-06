"use client";

import { useWallets } from "@privy-io/react-auth";
import { encodeFunctionData, getAddress, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { USDC_ADDRESS, USDC_DECIMALS } from "./constants";
import { usdcAbi } from "./usdcAbi";

type PayWithUsdcArgs = {
  /** Recipient address (Base Sepolia). Will be normalized with getAddress for EIP-55 checksum. */
  to: string;
  amount: number;
};

export function useUsdcPayment() {
  const { wallets } = useWallets();

  const payWithUsdc = async ({ to, amount }: PayWithUsdcArgs) => {
    const wallet = wallets[0];
    if (!wallet) {
      throw new Error("No wallet");
    }
    if (!to?.trim()) {
      throw new Error(
        "Recipient address is missing. Configure the artist wallet in .env.local (Base Sepolia) and refresh the page."
      );
    }

    const recipient = getAddress(to);
    const provider = await wallet.getEthereumProvider();
    const amountInUnits = parseUnits(
      amount.toFixed(USDC_DECIMALS),
      USDC_DECIMALS
    );
    const data = encodeFunctionData({
      abi: usdcAbi,
      functionName: "transfer",
      args: [recipient, amountInUnits],
    });

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: wallet.address,
          to: USDC_ADDRESS,
          data,
          chainId: baseSepolia.id,
        },
      ],
    });

    return txHash as string;
  };

  return { payWithUsdc };
}
