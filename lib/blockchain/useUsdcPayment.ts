"use client";

import { useWallets } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { USDC_ADDRESS, USDC_DECIMALS } from "./constants";
import { usdcAbi } from "./usdcAbi";

type PayWithUsdcArgs = {
  to: `0x${string}`;
  amount: number;
};

export function useUsdcPayment() {
  const { wallets } = useWallets();

  const payWithUsdc = async ({ to, amount }: PayWithUsdcArgs) => {
    const wallet = wallets[0];
    if (!wallet) {
      throw new Error("No wallet");
    }

    const provider = await wallet.getEthereumProvider();
    const amountInUnits = parseUnits(amount.toFixed(USDC_DECIMALS), USDC_DECIMALS);
    const data = encodeFunctionData({
      abi: usdcAbi,
      functionName: "transfer",
      args: [to, amountInUnits],
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
