import { getMockSales } from "./mockSales";
import { getTrackById } from "@/data/mock";
import { calculatePurchaseBreakdown } from "./purchase";

export interface ArtistStats {
  totalEarned: number;
  totalSales: number;
  totalPlatformFees: number;
  collaboratorEarnings: CollaboratorEarning[];
}

export interface CollaboratorEarning {
  walletAddress: string;
  role?: string;
  totalEarned: number;
  percentage: number;
  salesCount: number;
}

/**
 * Calculate artist statistics from mock sales
 */
export function calculateArtistStats(artistWalletAddress: string): ArtistStats {
  const allSales = getMockSales();
  const artistSales = allSales.filter(
    (sale) => sale.sellerAddress.toLowerCase() === artistWalletAddress.toLowerCase()
  );

  let totalEarned = 0;
  let totalPlatformFees = 0;
  const collaboratorMap = new Map<string, CollaboratorEarning>();

  for (const sale of artistSales) {
    const track = getTrackById(sale.trackId);
    if (!track) continue;

    const breakdown = calculatePurchaseBreakdown(track);
    totalPlatformFees += breakdown.platformFee;

    // Calculate earnings for each collaborator
    for (const split of breakdown.splits) {
      const existing = collaboratorMap.get(split.walletAddress);
      if (existing) {
        existing.totalEarned += split.amount;
        existing.salesCount += 1;
      } else {
        collaboratorMap.set(split.walletAddress, {
          walletAddress: split.walletAddress,
          role: split.role,
          totalEarned: split.amount,
          percentage: split.percentage,
          salesCount: 1,
        });
      }
    }

    // Add to total earned (net amount after platform fee)
    totalEarned += breakdown.netAmount;
  }

  // Convert map to array and sort by total earned (descending)
  const collaboratorEarnings = Array.from(collaboratorMap.values()).sort(
    (a, b) => b.totalEarned - a.totalEarned
  );

  return {
    totalEarned,
    totalSales: artistSales.length,
    totalPlatformFees,
    collaboratorEarnings,
  };
}

