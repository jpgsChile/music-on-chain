/**
 * Smart contract interface for Song NFT (Avalanche Fuji testnet).
 *
 * Mint flow: Wizard builds metadata (title, genre, language, AI usage, royalty splits),
 * encodes as JSON tokenURI, then calls mint(artistAddress, tokenURI).
 * Implement with wagmi writeContract when SongNFT contract is deployed on Avalanche Fuji.
 *
 * Contract interface (expected):
 * - mint(address to, string uri) returns (uint256 tokenId)
 * - Optional: EIP-2981 royalty info set at mint or via setTokenRoyalty
 */
export interface MintSongParams {
  /** Artist wallet (owner of the minted NFT) */
  artistAddress: string;
  /** Token URI (metadata JSON – IPFS or data URI; must include name, etc.) */
  tokenURI: string;
  /** Optional: royalty basis points for EIP-2981 (e.g. 500 = 5%) */
  royaltyPercentBps?: number;
}

export interface MintSongResult {
  success: boolean;
  txHash?: string;
  tokenId?: string;
  error?: string;
}

const AVALANCHE_FUJI_CHAIN_ID = 43113;

/**
 * Mint Song NFT on Avalanche Fuji.
 * Stub: replace with actual contract call (writeContract) when deployed.
 */
export async function mintSongNFT(params: MintSongParams): Promise<MintSongResult> {
  // TODO: connect to deployed SongNFT contract on Avalanche Fuji
  // Example with viem:
  // const hash = await writeContract(config, { address: SONG_NFT_ADDRESS, abi: SONG_NFT_ABI, functionName: 'mint', args: [params.artistAddress, params.tokenURI] });
  // return { success: true, txHash: hash, tokenId: ... };

  // Stub for UI development and integration tests
  if (!params.artistAddress || !params.tokenURI) {
    return {
      success: false,
      error: "Missing artistAddress or tokenURI",
    };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const stubHash = "0x" + "a".repeat(64);
      resolve({
        success: true,
        txHash: stubHash,
        tokenId: "1",
      });
    }, 1500);
  });
}

export function getSongNftChainId(): number {
  return AVALANCHE_FUJI_CHAIN_ID;
}
