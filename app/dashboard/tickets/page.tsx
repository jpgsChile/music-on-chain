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
import ConnectArtist from "@/components/ConnectArtist";
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
  const { authenticated, user } = useAuth();
  const wallet = user?.wallet?.address ?? "";
  const artist = getArtistByWallet(wallet);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !wallet) return;
    setEvents(getEventsByWallet(wallet));
  }, [wallet]);

  const refreshEvents = () => setEvents(getEventsByWallet(wallet));
  const ticketsT = t.tickets;

  const handleMint = async (event: TicketEvent) => {
    if (!wallet || mintingId) return;
    setMintingId(event.id);
    setFeedback(null);
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
        setFeedback({ type: "ok", text: ticketsT.mintSuccess });
      } else {
        setFeedback({ type: "err", text: ticketsT.mintError });
      }
    } catch {
      setFeedback({ type: "err", text: ticketsT.mintError });
    } finally {
      setMintingId(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{ticketsT.myEvents}</h1>
          <p className="text-foreground/70 mb-4">{t.dashboard.connectWalletDesc}</p>
          <div className="flex justify-center">
            <ConnectArtist
              variant="modal"
              className="px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover"
            />
          </div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-foreground mb-6">{ticketsT.myEvents}</h1>

        {!artist && (
          <div className="mb-6 border border-border rounded-xl p-4 bg-background">
            <p className="text-sm text-foreground/80">{t.dashboard.notRegisteredHint}</p>
            <Link
              href="/dashboard"
              className="inline-flex mt-3 text-sm text-accent hover:underline"
            >
              {t.dashboard.artistProfile}
            </Link>
          </div>
        )}

        {feedback && (
          <p
            className={`mb-4 text-sm ${
              feedback.type === "ok" ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {feedback.text}
          </p>
        )}

        {showCreate && artist ? (
          <div className="border border-border rounded-xl p-6 mb-6 bg-background">
            <h2 className="text-lg font-semibold text-foreground mb-4">{ticketsT.createEvent}</h2>
            <CreateEventForm
              artistWallet={wallet}
              artistSlug={artist.slug}
              onCreated={() => {
                refreshEvents();
                setShowCreate(false);
                setFeedback({ type: "ok", text: ticketsT.createEventHint });
              }}
            />
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="mt-3 text-sm text-foreground/70 hover:text-foreground"
            >
              {ticketsT.cancel}
            </button>
          </div>
        ) : artist ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mb-6 px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover"
          >
            + {ticketsT.createEvent}
          </button>
        ) : null}

        {events.length === 0 && !showCreate ? (
          <div className="border border-border rounded-xl p-8 text-center bg-background">
            <p className="font-semibold text-foreground">{ticketsT.noEvents}</p>
            <p className="text-sm text-foreground/60 mt-2">{ticketsT.createEventHint}</p>
            {artist && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-6 px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover"
              >
                {ticketsT.emptyCta}
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => {
              const published = Boolean(event.tokenId);
              return (
                <li
                  key={event.id}
                  className="border border-border rounded-xl p-4 bg-border/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground">{event.title}</h3>
                    <span className="text-xs text-foreground/50 shrink-0">
                      {published ? ticketsT.statusPublished : ticketsT.statusDraft}
                    </span>
                  </div>
                  {event.description ? (
                    <p className="text-sm text-foreground/70 mt-0.5">{event.description}</p>
                  ) : null}
                  <p className="text-xs text-foreground/50 mt-2">
                    {ticketsT.eventDate}: {formatDate(event.date)} · {ticketsT.eventLocation}:{" "}
                    {event.location}
                  </p>
                  <p className="text-sm text-foreground/80 mt-2">
                    {event.price} {t.general.usdc} · {event.supply} {ticketsT.supply}
                  </p>
                  {!published && (
                    <button
                      type="button"
                      onClick={() => handleMint(event)}
                      disabled={!!mintingId}
                      className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent-hover disabled:opacity-50"
                    >
                      {mintingId === event.id ? ticketsT.minting : ticketsT.mintTickets}
                    </button>
                  )}
                  {published && artist && (
                    <Link
                      href={`/artist/${artist.slug}`}
                      className="inline-flex mt-3 text-sm text-accent hover:underline"
                    >
                      {t.dashboard.viewPublicProfile}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
