import { appChain } from "@/lib/wagmi";

/**
 * Ticket NFT contract interface (Base Sepolia / Base).
 * ERC-1155 style: one event = one token id, supply = number of tickets.
 * Transferable; ownership on-chain for traceability.
 */

export interface MintTicketParams {
  artistAddress: string;
  /** Token URI (metadata JSON with TicketMetadata) */
  tokenURI: string;
  supply: number;
  /** Price in USDC (6 decimals) – optional if free */
  priceWei?: bigint;
}

export interface MintTicketResult {
  success: boolean;
  txHash?: string;
  tokenId?: string;
  error?: string;
}



/**
 * Mint ticket NFT batch (ERC-1155) on Base.
 * Stub: replace with writeContract when deployed.
 */
export async function mintTicketNFT(
  params: MintTicketParams
): Promise<MintTicketResult> {
  if (
    !params.artistAddress ||
    !params.tokenURI ||
    (params.supply ?? 0) < 1
  ) {
    return {
      success: false,
      error: "Missing artistAddress, tokenURI, or supply",
    };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        txHash: "0x" + "b".repeat(64),
        tokenId: String(Date.now() % 1e6),
      });
    }, 1500);
  });
}

export function getTicketNftChainId(): number {
  return appChain.id;
}
