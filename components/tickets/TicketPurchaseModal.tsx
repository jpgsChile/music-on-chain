"use client";

import { useState } from "react";
import type { TicketEvent } from "@/types/ticketNft";
import type { Artist } from "@/data/artists";
import { useWallets } from "@privy-io/react-auth";
import { useNativePayment } from "@/lib/blockchain/useUsdcPayment";
import { addTicketOwnership } from "@/lib/tickets/ownership";
import { formatUSDC } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

interface TicketPurchaseModalProps {
  event: TicketEvent;
  artist: Artist;
  artistWallet: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TicketPurchaseModal(props: TicketPurchaseModalProps) {
  const { event, artist, artistWallet, isOpen, onClose, onSuccess } = props;
  const locale = useLocale();
  const t = getTranslations(locale);
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";
  const { payWithNative } = useNativePayment();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBuy = async () => {
    if (!walletAddress || isProcessing || isSuccess) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const txHash = await payWithNative({ to: artistWallet, amount: event.price });
      addTicketOwnership({
        eventId: event.id,
        tokenId: event.tokenId || event.id,
        ownerWallet: walletAddress,
        artistSlug: artist.slug,
        txHash,
        chain: "avalanche-fuji",
        acquiredAt: new Date().toISOString(),
        eventTitle: event.title,
        eventDate: event.date,
        locationType: event.locationType,
        location: event.location,
        accessRules: event.accessRules,
      });
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch {
      setErrorMessage(t.contributeModal?.error ?? "Error al procesar el pago.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const purchaseT = t.purchase as Record<string, string> | undefined;
  const confirmLabel = purchaseT?.confirmButton ?? "Confirmar compra";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
    >
      <div className="bg-background border border-border rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-foreground">{event.title}</h2>
        <p className="text-sm text-foreground/70 mt-1">{event.description}</p>
        <p className="text-xs text-foreground/50 mt-2">
          {event.date} · {event.location}
        </p>
        <p className="text-lg font-semibold text-foreground mt-4">
          {event.price} AVAX
        </p>
        {errorMessage && (
          <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
        )}
        {isSuccess && (
          <p className="text-sm text-emerald-500 mt-2">
            {t.contributeModal?.success ?? "¡Gracias!"}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-border rounded-lg hover:bg-border/30 disabled:opacity-50"
          >
            {t.contributeModal?.cancel ?? "Cancelar"}
          </button>
          <button
            type="button"
            onClick={handleBuy}
            disabled={isProcessing || !walletAddress}
            className="px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50"
          >
            {isProcessing
              ? t.contributeModal?.processing ?? "Procesando…"
              : `${confirmLabel} ${formatUSDC(event.price)} AVAX`}
          </button>
        </div>
      </div>
    </div>
  );
}
