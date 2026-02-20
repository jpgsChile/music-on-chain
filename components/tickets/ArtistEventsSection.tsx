"use client";

import { useState, useEffect } from "react";
import type { Artist } from "@/data/artists";
import { getArtistWallet } from "@/data/artists";
import { getEventsByArtistSlug } from "@/lib/tickets/events";
import type { TicketEvent } from "@/types/ticketNft";
import TicketPurchaseModal from "./TicketPurchaseModal";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return d;
  }
}

interface ArtistEventsSectionProps {
  artist: Artist;
  artistWalletOverride?: string;
}

export default function ArtistEventsSection({
  artist,
  artistWalletOverride,
}: ArtistEventsSectionProps) {
  const locale = useLocale();
  const t = (getTranslations(locale).tickets || {}) as Record<string, string>;
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [purchaseEvent, setPurchaseEvent] = useState<TicketEvent | null>(null);

  const artistWallet =
    artistWalletOverride?.trim() || getArtistWallet(artist);

  useEffect(() => {
    setEvents(getEventsByArtistSlug(artist.slug));
  }, [artist.slug]);

  const safeEvents = events.filter(
    (e): e is TicketEvent => e != null && typeof e.id === "string"
  );
  if (safeEvents.length === 0) return null;

  return (
    <>
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          🎟️ {t.eventsSectionTitle ?? t.myEvents}
        </h2>
        <ul className="space-y-4">
          {safeEvents.map((event) => (
            <li
              key={event.id}
              className="border border-border rounded-xl p-4 bg-border/10"
            >
              <h3 className="font-medium text-foreground">{event.title}</h3>
              <p className="text-sm text-foreground/70 mt-0.5">
                {event.description}
              </p>
              <p className="text-xs text-foreground/50 mt-2">
                {t.eventDate}: {formatDate(event.date)} · {t.eventLocation}:{" "}
                {event.location} ({event.locationType})
              </p>
              <p className="text-sm text-foreground/80 mt-2">
                {event.price} AVAX
              </p>
              <button
                type="button"
                onClick={() => setPurchaseEvent(event)}
                className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent-hover"
              >
                {t.buyTicket ?? "Comprar entrada"}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {purchaseEvent && (
        <TicketPurchaseModal
          event={purchaseEvent}
          artist={artist}
          artistWallet={artistWallet}
          isOpen={!!purchaseEvent}
          onClose={() => setPurchaseEvent(null)}
          onSuccess={() => setPurchaseEvent(null)}
        />
      )}
    </>
  );
}
