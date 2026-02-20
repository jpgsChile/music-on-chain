"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
import { getArtistByWallet } from "@/data/artists";
import {
  getEventsByWallet,
  updateEvent,
} from "@/lib/tickets/events";
import { mintTicketNFT } from "@/lib/contracts/ticketNft";
import { buildTicketMetadata } from "@/lib/tickets/metadata";
import CreateEventForm from "@/components/tickets/CreateEventForm";
import type { TicketEvent } from "@/types/ticketNft";

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return d;
  }
}

export default function DashboardTicketsPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { authenticated, login, ready, user } = useAuth();
  const wallet = user?.wallet?.address ?? "";
  const artist = getArtistByWallet(wallet);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [mintingId, setMintingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !wallet) return;
    setEvents(getEventsByWallet(wallet));
  }, [wallet]);

  const refreshEvents = () => setEvents(getEventsByWallet(wallet));

  const handleMint = async (event: TicketEvent) => {
    if (!wallet || mintingId) return;
    setMintingId(event.id);
    try {
      const metadata = buildTicketMetadata(event, event.tokenId ?? event.id);
      const tokenURI = "data:application/json," + encodeURIComponent(JSON.stringify(metadata));
      const result = await mintTicketNFT({
        artistAddress: wallet,
        tokenURI,
        supply: event.supply,
      });
      if (result.success && result.tokenId) {
        updateEvent(event.id, { tokenId: result.tokenId });
        refreshEvents();
      }
    } finally {
      setMintingId(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{t.dashboard.title}</h1>
          <p className="text-foreground/70 mb-4">{t.dashboard.connectWalletDesc}</p>
          <button
            onClick={login}
            disabled={!ready}
            className="px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover disabled:opacity-50"
          >
            {ready ? t.auth.signIn : t.auth.loading}
          </button>
        </div>
      </div>
    );
  }

  const ticketsT = (t.tickets || {}) as Record<string, string>;

  return (
    <div className="min-h-screen px-4 sm:px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-foreground/70 hover:text-foreground"
          >
            ← {t.dashboard.title}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">🎟️ {ticketsT.myEvents}</h1>
        <p className="text-foreground/70 text-sm mb-2">
          {ticketsT.noEvents}
        </p>
        <p className="text-foreground/50 text-xs mb-6">
          {ticketsT.createEventHint}
        </p>

        {showCreate && artist ? (
          <div className="border border-border rounded-xl p-6 mb-6 bg-background">
            <h2 className="text-lg font-semibold text-foreground mb-4">{ticketsT.createEvent}</h2>
            <CreateEventForm
              artistWallet={wallet}
              artistSlug={artist.slug}
              onCreated={(e) => {
                refreshEvents();
                setShowCreate(false);
              }}
            />
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="mt-3 text-sm text-foreground/70 hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mb-6 px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover"
          >
            + {ticketsT.createEvent}
          </button>
        )}

        <ul className="space-y-4">
          {events.map((event) => (
            <li
              key={event.id}
              className="border border-border rounded-xl p-4 bg-border/10"
            >
              <h3 className="font-medium text-foreground">{event.title}</h3>
              <p className="text-sm text-foreground/70 mt-0.5">{event.description}</p>
              <p className="text-xs text-foreground/50 mt-2">
                {ticketsT.eventDate}: {formatDate(event.date)} · {ticketsT.eventLocation}: {event.location} ({event.locationType})
              </p>
              <p className="text-sm text-foreground/80 mt-2">
                {event.price} AVAX · {event.supply} {ticketsT.supply}
              </p>
              <button
                type="button"
                onClick={() => handleMint(event)}
                disabled={!!mintingId}
                className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent-hover disabled:opacity-50"
              >
                {mintingId === event.id ? "…" : ticketsT.mintTickets}
              </button>
            </li>
          ))}
        </ul>
        {events.length === 0 && !showCreate && (
          <p className="text-foreground/60 text-sm">{ticketsT.noEvents}</p>
        )}
      </div>
    </div>
  );
}
