// Mock data for development

import { Artist, Track, Split } from "@/types";

// Mock wallet addresses (Avalanche Fuji format)
const WALLETS = {
  artist1: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  artist2: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  artist3: "0x1234567890123456789012345678901234567890",
  producer1: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  producer2: "0xfedcbafedcbafedcbafedcbafedcbafedcbafedc",
  coWriter1: "0x1111111111111111111111111111111111111111",
  coWriter2: "0x2222222222222222222222222222222222222222",
  mixer1: "0x3333333333333333333333333333333333333333",
};

const DEFAULT_AVATAR = "/avatars/default.svg";
const DEFAULT_COVER = "/covers/default.svg";

// Artists
export const mockArtists: Artist[] = [
  {
    id: "artist-1",
    name: "Luna Eclipse",
    bio: "Electronic music producer and DJ from Berlin. Known for blending ambient soundscapes with deep house beats.",
    avatar: DEFAULT_AVATAR,
    walletAddress: WALLETS.artist1,
  },
  {
    id: "artist-2",
    name: "Midnight Waves",
    bio: "Indie rock band from Portland. Their sound combines nostalgic 80s synth-pop with modern indie sensibilities.",
    avatar: DEFAULT_AVATAR,
    walletAddress: WALLETS.artist2,
  },
  {
    id: "artist-3",
    name: "Neon Dreams",
    bio: "Hip-hop artist and producer from Atlanta. Fusing trap beats with jazz influences and conscious lyrics.",
    avatar: DEFAULT_AVATAR,
    walletAddress: WALLETS.artist3,
  },
];

// Helper function to create splits
function createSplits(
  artistWallet: string,
  additionalWallets: { address: string; percentage: number; role: string }[]
): Split[] {
  const splits: Split[] = [
    {
      id: `split-${artistWallet}-artist`,
      walletAddress: artistWallet,
      percentage: 100 - additionalWallets.reduce((sum, w) => sum + w.percentage, 0),
      role: "Artist",
    },
    ...additionalWallets.map((w, idx) => ({
      id: `split-${w.address}-${idx}`,
      walletAddress: w.address,
      percentage: w.percentage,
      role: w.role,
    })),
  ];
  return splits;
}

// Tracks
export const mockTracks: Track[] = [
  // Luna Eclipse tracks
  {
    id: "track-1",
    title: "Stellar Drift",
    artist: mockArtists[0],
    duration: 245, // 4:05
    coverArt: DEFAULT_COVER,
    price: 15.99, // USDC
    format: "FLAC",
    type: "album",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    splits: createSplits(WALLETS.artist1, [
      { address: WALLETS.producer1, percentage: 20, role: "Producer" },
      { address: WALLETS.mixer1, percentage: 10, role: "Mix Engineer" },
    ]),
    releaseDate: "2024-01-15T00:00:00Z",
    genre: "Electronic",
  },
  {
    id: "track-2",
    title: "Cosmic Resonance",
    artist: mockArtists[0],
    duration: 312, // 5:12
    coverArt: DEFAULT_COVER,
    price: 18.50, // USDC
    format: "WAV",
    type: "live",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    splits: createSplits(WALLETS.artist1, [
      { address: WALLETS.producer1, percentage: 25, role: "Co-producer" },
      { address: WALLETS.coWriter1, percentage: 15, role: "Co-writer" },
    ]),
    releaseDate: "2024-02-20T00:00:00Z",
    genre: "Ambient House",
  },
  // Midnight Waves tracks
  {
    id: "track-3",
    title: "City Lights",
    artist: mockArtists[1],
    duration: 198, // 3:18
    coverArt: DEFAULT_COVER,
    price: 12.99, // USDC
    format: "FLAC",
    type: "album",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    splits: createSplits(WALLETS.artist2, [
      { address: WALLETS.producer2, percentage: 30, role: "Producer" },
      { address: WALLETS.coWriter2, percentage: 10, role: "Lyricist" },
    ]),
    releaseDate: "2024-03-10T00:00:00Z",
    genre: "Indie Rock",
  },
  {
    id: "track-4",
    title: "Retro Future",
    artist: mockArtists[1],
    duration: 267, // 4:27
    coverArt: DEFAULT_COVER,
    price: 14.50, // USDC
    format: "WAV",
    type: "demo",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    splits: createSplits(WALLETS.artist2, [
      { address: WALLETS.producer2, percentage: 20, role: "Producer" },
      { address: WALLETS.mixer1, percentage: 15, role: "Mix & Master" },
    ]),
    releaseDate: "2024-04-05T00:00:00Z",
    genre: "Synth-Pop",
  },
  // Neon Dreams tracks
  {
    id: "track-5",
    title: "Street Symphony",
    artist: mockArtists[2],
    duration: 189, // 3:09
    coverArt: DEFAULT_COVER,
    price: 19.99, // USDC
    format: "FLAC",
    type: "album",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    splits: createSplits(WALLETS.artist3, [
      { address: WALLETS.producer1, percentage: 35, role: "Beat Producer" },
      { address: WALLETS.coWriter1, percentage: 20, role: "Co-writer" },
    ]),
    releaseDate: "2024-05-12T00:00:00Z",
    genre: "Hip-Hop",
  },
  {
    id: "track-6",
    title: "Jazz Trap",
    artist: mockArtists[2],
    duration: 223, // 3:43
    coverArt: DEFAULT_COVER,
    price: 16.75, // USDC
    format: "WAV",
    type: "live",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    splits: createSplits(WALLETS.artist3, [
      { address: WALLETS.producer2, percentage: 40, role: "Producer" },
      { address: WALLETS.coWriter2, percentage: 15, role: "Co-writer" },
    ]),
    releaseDate: "2024-06-01T00:00:00Z",
    genre: "Trap Jazz",
  },
];

// Mock sales data
export const mockSales: import("@/types").Sale[] = [
  {
    id: "sale-1",
    trackId: "track-1",
    buyerAddress: "0xBuyer1111111111111111111111111111111111",
    sellerAddress: WALLETS.artist1,
    amount: 15.99,
    timestamp: "2024-01-20T10:30:00Z",
    transactionHash: "0xHash111111111111111111111111111111111111111111111111111111111111",
  },
  {
    id: "sale-2",
    trackId: "track-3",
    buyerAddress: "0xBuyer2222222222222222222222222222222222",
    sellerAddress: WALLETS.artist2,
    amount: 12.99,
    timestamp: "2024-03-15T14:20:00Z",
    transactionHash: "0xHash222222222222222222222222222222222222222222222222222222222222",
  },
  {
    id: "sale-3",
    trackId: "track-5",
    buyerAddress: "0xBuyer3333333333333333333333333333333333",
    sellerAddress: WALLETS.artist3,
    amount: 19.99,
    timestamp: "2024-05-18T09:15:00Z",
    transactionHash: "0xHash333333333333333333333333333333333333333333333333333333333333",
  },
];

// Helper functions to get data
export function getTrackById(id: string): Track | undefined {
  return mockTracks.find((track) => track.id === id);
}

export function getArtistById(id: string): Artist | undefined {
  return mockArtists.find((artist) => artist.id === id);
}

export function getTracksByArtist(artistId: string): Track[] {
  return mockTracks.filter((track) => track.artist.id === artistId);
}

export function getSalesByTrack(trackId: string): import("@/types").Sale[] {
  return mockSales.filter((sale) => sale.trackId === trackId);
}
