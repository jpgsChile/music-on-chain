import type { TicketEvent, AccessRule } from "@/types/ticketNft";

const STORAGE_KEY = "music_on_chain_events";

function load(): TicketEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: TicketEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getEventsByWallet(wallet: string): TicketEvent[] {
  if (!wallet) return [];
  const w = wallet.toLowerCase();
  return load().filter((e) => e.artistWallet?.toLowerCase() === w);
}

export function getEventsByArtistSlug(artistSlug: string): TicketEvent[] {
  if (!artistSlug) return [];
  return load().filter((e) => e.artistSlug === artistSlug);
}

export function getEventById(eventId: string): TicketEvent | undefined {
  return load().find((e) => e.id === eventId);
}

export function createEvent(
  artistWallet: string,
  artistSlug: string,
  input: {
    title: string;
    description: string;
    date: string;
    locationType: "physical" | "virtual";
    location: string;
    accessRules: AccessRule[];
    supply: number;
    price: number;
  }
): TicketEvent {
  const event: TicketEvent = {
    id: `event-${Date.now()}`,
    artistSlug,
    artistWallet,
    title: input.title.trim() || "Event",
    description: input.description.trim() || "",
    date: input.date,
    locationType: input.locationType,
    location: input.location.trim() || "",
    accessRules: input.accessRules ?? [],
    supply: Math.max(1, input.supply ?? 1),
    price: Math.max(0, input.price ?? 0),
    currency: "AVAX",
    createdAt: new Date().toISOString(),
  };
  const list = load();
  list.push(event);
  save(list);
  return event;
}

export function updateEvent(
  eventId: string,
  patch: Partial<Pick<TicketEvent, "tokenId" | "contractAddress">>
): void {
  const list = load();
  const idx = list.findIndex((e) => e.id === eventId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  save(list);
}
