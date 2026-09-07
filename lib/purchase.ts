/**
 * Mock marketplace breakdown (local UI). Not the MOC economic domain.
 * Domain fees live in lib/domain/economics (versioned ProtocolFeePolicy).
 * Splits here still key off wallet for the Mock catalog only.
 */

import { Track } from "@/types";

const PLATFORM_FEE_PERCENTAGE = 2; // 2%

export interface PurchaseBreakdown {
  trackPrice: number;
  platformFee: number;
  netAmount: number;
  splits: SplitBreakdown[];
}

export interface SplitBreakdown {
  walletAddress: string;
  percentage: number;
  amount: number;
  role?: string;
}

/**
 * Calculate purchase breakdown including platform fee and splits
 */
export function calculatePurchaseBreakdown(track: Track): PurchaseBreakdown {
  const trackPrice = track.price;
  const platformFee = (trackPrice * PLATFORM_FEE_PERCENTAGE) / 100;
  const netAmount = trackPrice - platformFee;

  const splits: SplitBreakdown[] = track.splits.map((split) => ({
    walletAddress: split.walletAddress,
    percentage: split.percentage,
    amount: (netAmount * split.percentage) / 100,
    role: split.role,
  }));

  return {
    trackPrice,
    platformFee,
    netAmount,
    splits,
  };
}

/**
 * Format USDC amount to 2 decimal places
 */
export function formatUSDC(amount: number): string {
  return amount.toFixed(2);
}

