"use client";

import type { TicketOwnership } from "@/types/ticketNft";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import TicketCard from "./TicketCard";

interface FanTicketListProps {
  tickets: TicketOwnership[];
}

export default function FanTicketList({ tickets }: FanTicketListProps) {
  const locale = useLocale();
  const t = (getTranslations(locale).tickets || {}) as Record<string, string>;

  if (tickets.length === 0) {
    return <p className="text-foreground/60 text-sm">{t.noTickets}</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {tickets.map((ticket) => (
        <li key={`${ticket.eventId}-${ticket.tokenId}-${ticket.acquiredAt}`}>
          <TicketCard ticket={ticket} />
        </li>
      ))}
    </ul>
  );
}
