import type { TicketOwnership } from "@/types/ticketNft";

const STORAGE_KEY = "music_on_chain_ticket_ownership";

function load(): TicketOwnership[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is TicketOwnership =>
        typeof o === "object" && o !== null && typeof o.eventId === "string"
    );
  } catch {
    return [];
  }
}

function save(list: TicketOwnership[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getTicketsByWallet(wallet: string): TicketOwnership[] {
  if (!wallet) return [];
  const w = wallet.toLowerCase();
  return load().filter((t) => t.ownerWallet?.toLowerCase() === w);
}

export function addTicketOwnership(record: TicketOwnership): void {
  const list = load();
  list.push(record);
  save(list);
}
