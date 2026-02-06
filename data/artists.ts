/**
 * Multi-artist data – single source of truth.
 * No hardcoded artist; UI renders from this.
 */

export interface Track {
  id: string;
  title: string;
  audioUrl: string;
  price: number;
  currency: "USDC";
}

export interface CrowdfundingCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  currency: "USDC";
  deadline: string; // ISO date or YYYY-MM-DD
  benefits: string[];
}

export interface ArtistNFT {
  id: string;
  name: string;
  description: string;
  price: number;
  supply: number;
  utility: "ticket" | "access" | "membership";
}

export interface ArtistSocials {
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

export interface Artist {
  slug: string;
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  wallet: string;
  tracks: Track[];
  crowdfunding?: CrowdfundingCampaign;
  nfts?: ArtistNFT[];
  socials?: ArtistSocials;
}

function getEnvWallet(key: string): string {
  if (typeof process === "undefined") return "";
  return (process.env as Record<string, string | undefined>)[key] ?? "";
}

export const artists: Artist[] = [
  {
    slug: "cleaver",
    name: "CLEAVER",
    description:
      "Destacada banda chilena de rock alternativo formada en 2011, reconocida por su sonido enérgico influenciado por el grunge y el rock de los 90",
    logoUrl: "/assets/cleaver/cleaver-logo.png",
    coverUrl: "/assets/cleaver/cleaver-band.jpg",
    wallet: getEnvWallet("NEXT_PUBLIC_CLEAVER_WALLET") || "0x4459A9a79B343A447A0e9811B02AEbc823707706",
    tracks: [
      {
        id: "cleaver-track-1",
        title: "Mirrors",
        audioUrl: "/assets/cleaver/mirrors.wav",
        price: 1,
        currency: "USDC",
      },
    ],
    crowdfunding: {
      id: "cleaver-album-2026",
      title: "New Album Funding",
      description: "Help us fund our next studio album",
      targetAmount: 5000,
      raisedAmount: 1250,
      currency: "USDC",
      deadline: "2026-06-30",
      benefits: [
        "Exclusive NFT",
        "Early access to tracks",
        "Backstage content",
      ],
    },
    nfts: [
      {
        id: "cleaver-live-2026",
        name: "Live Show Santiago 2026",
        description: "NFT Ticket",
        price: 20,
        supply: 300,
        utility: "ticket",
      },
    ],
    socials: {
      tiktok: "https://www.tiktok.com/@cleaverband",
      facebook: "https://www.facebook.com/CleaverOfficial",
      instagram: "https://www.instagram.com/cleaverband/",
      youtube: "https://www.youtube.com/channel/UC0YaD7PQahOyWit4OC2MzmA",
    },
  },
];

export const PREVIEW_SECONDS = 30;

export function getArtistBySlug(slug: string): Artist | undefined {
  return artists.find((a) => a.slug === slug);
}

/** Resolve artist wallet (server can inject env for cleaver). */
export function getArtistWallet(artist: Artist): string {
  if (artist.slug === "cleaver" && typeof process !== "undefined") {
    const env = (process.env as Record<string, string | undefined>).NEXT_PUBLIC_CLEAVER_WALLET;
    if (env?.trim()) return env.trim();
  }
  return artist.wallet;
}
