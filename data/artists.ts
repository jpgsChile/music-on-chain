/**
 * Multi-artist data – single source of truth.
 * No hardcoded artist; UI renders from this.
 */

export interface Track {
  id: string;
  title: string;
  audioUrl: string;
  price: number;
  currency: "AVAX";
}

/** Perk type for campaign rewards (NFT, early access, exclusive content) */
export type CrowdfundingPerkType = "nft" | "early_access" | "exclusive_content";

export interface CrowdfundingPerk {
  type: CrowdfundingPerkType;
  title: string;
  description?: string;
  /** Minimum contribution (AVAX) to unlock this perk */
  minAmount?: number;
}

export interface CrowdfundingCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  currency: "AVAX";
  deadline: string; // ISO date or YYYY-MM-DD
  benefits: string[];
  /** Track IDs linked to this campaign (e.g. album tracks) */
  linkedTrackIds?: string[];
  /** Structured perks (NFTs, early access, exclusive content) */
  perks?: CrowdfundingPerk[];
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
        currency: "AVAX",
      },
      {
        id: "cleaver-track-2",
        title: "Vengeance",
        audioUrl: "/assets/cleaver/VENGEANCE.wav",
        price: 2,
        currency: "AVAX",
      },
    ],
    crowdfunding: {
      id: "cleaver-album-2026",
      title: "New Album Funding",
      description: "Help us fund our next studio album",
      targetAmount: 5000,
      raisedAmount: 1250,
      currency: "AVAX",
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
  {
    slug: "sou",
    name: "The SOU (Sound of the Universe)",
    description:
      "The SOU (Sound of the Universe) es una banda chilena formada por Pía Carpanetti y Carlos Cleaver, con un estilo que fusiona dark pop, new wave y rock. Surgida en 2020, se caracteriza por paisajes sonoros atmosféricos, letras emocionales y la creación de su álbum debut \"X\".",
    logoUrl: "/assets/sou/sou-logo.jpg",
    coverUrl: "/assets/sou/sou-band.PNG",
    wallet: getEnvWallet("NEXT_PUBLIC_SOU_WALLET") || "0x0000000000000000000000000000000000000000",
    tracks: [
      {
        id: "sou-track-1",
        title: "Burn Again",
        audioUrl: "/assets/sou/Burn Again.wav",
        price: 1,
        currency: "AVAX",
      },
      {
        id: "sou-track-2",
        title: "Do What U Want",
        audioUrl: "/assets/sou/Do What U Want.wav",
        price: 1,
        currency: "AVAX",
      },
    ],
  },
];

export const PREVIEW_SECONDS = 30;

export function getArtistBySlug(slug: string): Artist | undefined {
  return artists.find((a) => a.slug === slug);
}

/** Resolve artist wallet (server can inject env per artist). */
export function getArtistWallet(artist: Artist): string {
  if (typeof process === "undefined") return artist.wallet;
  const envKey =
    artist.slug === "cleaver"
      ? "NEXT_PUBLIC_CLEAVER_WALLET"
      : artist.slug === "sou"
        ? "NEXT_PUBLIC_SOU_WALLET"
        : null;
  if (envKey) {
    const env = (process.env as Record<string, string | undefined>)[envKey];
    if (env?.trim()) return env.trim();
  }
  return artist.wallet;
}

/** Find artist whose wallet matches the given address (case-insensitive). */
export function getArtistByWallet(address: string): Artist | undefined {
  if (!address?.trim()) return undefined;
  const normalized = address.trim().toLowerCase();
  return artists.find(
    (a) => getArtistWallet(a).toLowerCase() === normalized
  );
}
