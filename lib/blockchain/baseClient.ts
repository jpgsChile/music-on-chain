import { createPublicClient, http } from "viem";
import { appChain } from "@/lib/wagmi";

export const publicClient = createPublicClient({
  chain: appChain,
  transport: http(),
});
