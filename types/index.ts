// Type definitions for Music on Chain MVP

export interface Artist {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  walletAddress: string;
}

export type AudioFormat = "WAV" | "FLAC";

export interface Split {
  id: string;
  walletAddress: string;
  percentage: number; // 0-100
  role?: string; // e.g., "Producer", "Co-writer", "Artist"
}

export interface Track {
  id: string;
  title: string;
  artist: Artist;
  duration: number; // in seconds
  coverArt?: string;
  price: number; // in USDC
  format: AudioFormat;
  previewUrl: string; // URL for preview audio
  splits: Split[];
  releaseDate?: string; // ISO date string
  genre?: string;
}

export interface Sale {
  id: string;
  trackId: string;
  buyerAddress: string;
  sellerAddress: string; // artist wallet
  amount: number; // in USDC
  timestamp: string; // ISO date string
  transactionHash?: string;
}

export interface User {
  id: string;
  address?: string;
  name?: string;
}

