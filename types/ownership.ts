/**
 * Modelo definitivo de ownership para MVP.
 * Persistido en localStorage (key: music_on_chain_ownership).
 */
export interface TrackOwnership {
  buyer: string;
  artist: string;
  trackId: string;
  txHash: string;
  chain: "base-sepolia";
  purchasedAt: string;
}

/**
 * Contribución a crowdfunding por artista.
 * Persistido en localStorage (key: music_on_chain_crowdfunding).
 */
export interface CrowdfundingContribution {
  wallet: string;
  artist: string;
  campaignId: string;
  amount: number;
  txHash: string;
  chain: "base-sepolia";
  contributedAt: string;
}
