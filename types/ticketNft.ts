/**
 * Ticket NFT system – metadata standard and ownership.
 * Compatible with ERC-721/1155 and marketplaces (OpenSea, etc.).
 */

/** Location type for the event */
export type TicketLocationType = "physical" | "virtual";

/** Access rule: who can use the ticket (e.g. "door", "backstage", "vip") */
export interface AccessRule {
  type: string;
  description?: string;
}

/**
 * NFT Metadata standard for Ticket (ERC-721/1155).
 * Stored off-chain (IPFS or API); tokenURI points to this JSON.
 */
export interface TicketMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  /** EIP-1155 / OpenSea style attributes for filtering and display */
  attributes: Array<{
    trait_type: string;
    value: string | number | boolean;
    display_type?: "date" | "number";
  }>;
  /** Custom extension: event details for tickets */
  ticket?: {
    eventId: string;
    eventTitle: string;
    date: string;
    locationType: TicketLocationType;
    location: string;
    accessRules: AccessRule[];
    artistSlug: string;
    chainId: number;
  };
}

/**
 * Event created by an artist. Used to mint ticket NFTs.
 */
export interface TicketEvent {
  id: string;
  artistSlug: string;
  artistWallet: string;
  title: string;
  description: string;
  date: string;
  locationType: TicketLocationType;
  location: string;
  accessRules: AccessRule[];
  supply: number;
  price: number;
  currency: "AVAX";
  /** After mint: tokenId and contract for traceability */
  tokenId?: string;
  contractAddress?: string;
  createdAt: string;
}

/**
 * Fan ownership of a ticket NFT. Transferable but traceable (chain + txHash).
 */
export interface TicketOwnership {
  eventId: string;
  tokenId: string;
  ownerWallet: string;
  artistSlug: string;
  txHash: string;
  chain: "avalanche-fuji";
  acquiredAt: string;
  /** For display: snapshot of event at acquisition */
  eventTitle: string;
  eventDate: string;
  locationType: TicketLocationType;
  location: string;
  accessRules: AccessRule[];
}
