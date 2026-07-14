"use client";

import Link from "next/link";
import type { TicketOwnership } from "@/types/ticketNft";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { appChain } from "@/lib/wagmi";

const BASE_EXPLORER =
  appChain.id === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      dateStyle: "medium",
      timeZone: "UTC",
    });
  } catch {
    return d;
  }
}

interface TicketCardProps {
  ticket: TicketOwnership;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const locale = useLocale();
  const t = (getTranslations(locale).tickets || {}) as Record<string, string>;
  const explorerUrl = ticket.txHash
    ? `${BASE_EXPLORER}/tx/${ticket.txHash}`
    : null;

  return (
    <article className="border border-border rounded-xl overflow-hidden bg-background hover:border-border/80 transition-colors">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
            🎟️ {t.eventDate}
          </span>
          <span className="text-xs text-foreground/60">{formatDate(ticket.eventDate)}</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">{ticket.eventTitle}</h3>
        <p className="text-sm text-foreground/70 mt-1">
          {t.eventLocation}: {ticket.location}
          {ticket.locationType && (
            <span className="text-foreground/50"> ({ticket.locationType})</span>
          )}
        </p>
        {ticket.accessRules?.length > 0 && (
          <p className="text-sm text-foreground/80 mt-2">
            {t.access}: {ticket.accessRules.map((r) => r.type).join(", ")}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
            {t.transferable}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-border text-foreground/80">
            {t.traceable}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/artist/${ticket.artistSlug}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            {t.viewArtist} →
          </Link>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              {t.viewOnExplorer}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
