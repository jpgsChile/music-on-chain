/**
 * Royalty Engine – Mock / reference UI. Not domain authority.
 * Economic truth: Actor → Rights → Revenue → Distribution → Entitlement → Settlement
 * in lib/domain/economics.
 */

export type RoyaltyRole =
  | "artist"
  | "producer"
  | "composer"
  | "performer"
  | "author"
  | "other";

export interface RoyaltyParticipant {
  id: string;
  name: string;
  role: RoyaltyRole;
  percentage: number;
  /** Accruing, not yet withdrawable */
  pendingBalance: number;
  /** Ready to withdraw */
  availableBalance: number;
  avatarUrl?: string | null;
  /** Soft accent for avatar / flow */
  color: string;
}

export interface RoyaltyPaymentEvent {
  id: string;
  at: string; // ISO
  workTitle: string;
  grossAmount: number;
  currency: "USDC";
  status: "settled" | "processing" | "pending";
  splits: { participantId: string; amount: number; percentage: number }[];
}

export interface RoyaltyEngineSnapshot {
  currency: "USDC";
  networkLabel: "Base";
  totalPending: number;
  totalAvailable: number;
  totalDistributed: number;
  participants: RoyaltyParticipant[];
  payments: RoyaltyPaymentEvent[];
  /** Default split used for auto-visualization */
  defaultSplit: { role: RoyaltyRole; percentage: number; name: string; color: string }[];
}
