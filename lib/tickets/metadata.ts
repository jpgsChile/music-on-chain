import type { TicketEvent, TicketMetadata, AccessRule } from "@/types/ticketNft";

const BASE_SEPOLIA_CHAIN_ID = 84532;

/**
 * Build NFT metadata JSON for a ticket (ERC-721/1155).
 * Used when minting; tokenURI can point to this or an IPFS copy.
 */
export function buildTicketMetadata(
  event: TicketEvent,
  tokenId: string
): TicketMetadata {
  const attributes: TicketMetadata["attributes"] = [
    { trait_type: "Event", value: event.title },
    { trait_type: "Date", value: event.date, display_type: "date" },
    { trait_type: "Location", value: event.location },
    { trait_type: "Location Type", value: event.locationType },
    { trait_type: "Artist", value: event.artistSlug },
  ];
  event.accessRules.forEach((rule: AccessRule) => {
    attributes.push({
      trait_type: rule.type,
      value: rule.description ?? rule.type,
    });
  });

  return {
    name: `Ticket: ${event.title}`,
    description: event.description || `Admission to ${event.title}`,
    attributes,
    ticket: {
      eventId: event.id,
      eventTitle: event.title,
      date: event.date,
      locationType: event.locationType,
      location: event.location,
      accessRules: event.accessRules,
      artistSlug: event.artistSlug,
      chainId: BASE_SEPOLIA_CHAIN_ID,
    },
  };
}
