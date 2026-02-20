"use client";

import { Track } from "@/types";
import { calculatePurchaseBreakdown, formatUSDC } from "@/lib/purchase";
import { formatAddress } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useEffect, useState } from "react";
import { useNativePayment } from "@/lib/blockchain/useUsdcPayment";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs text-accent hover:underline"
      title="Copiar dirección"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

interface PurchaseModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
}

export default function PurchaseModal({
  track,
  isOpen,
  onClose,
  onSuccess,
}: PurchaseModalProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const breakdown = calculatePurchaseBreakdown(track);
  const { payWithNative } = useNativePayment();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isBusy = isProcessing || isSuccess;
  const artistWallet = track.artist.walletAddress;
  const amountToArtist = Number((track.price * 0.98).toFixed(6));

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBusy) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isBusy, onClose]);

  const handleConfirm = async () => {
    if (isBusy) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const txHash = await payWithNative({
        to: artistWallet,
        amount: amountToArtist,
      });

      setIsSuccess(true);
      window.setTimeout(() => {
        onSuccess(txHash);
        onClose();
      }, 1500);
    } catch (error) {
      console.error(error);
      setErrorMessage(t.purchase.paymentError);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div className="bg-background border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {t.purchase.confirm}
              </h2>
              <p className="text-foreground/70">
                {track.title} by {track.artist.name}
              </p>
            </div>
            {!isBusy && (
              <button
                onClick={onClose}
                className="text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price Summary */}
          <div className="bg-border/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-foreground/70">{t.purchase.trackPrice}</span>
              <span className="text-lg font-semibold text-foreground">
                ${formatUSDC(breakdown.trackPrice)} {t.general.usdc}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground/70">{t.purchase.platformFee}</span>
              <span className="text-foreground">
                -${formatUSDC(breakdown.platformFee)} {t.general.usdc}
              </span>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">
                  {t.purchase.netAmount}
                </span>
                <span className="text-xl font-bold text-accent">
                  ${formatUSDC(breakdown.netAmount)} {t.general.usdc}
                </span>
              </div>
            </div>
          </div>

          {/* Destino del pago — dirección que recibe AVAX */}
          <div className="bg-border/20 rounded-lg p-4 border border-border/50">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">
                Destino del pago (recibe AVAX)
              </span>
              <CopyButton text={artistWallet} />
            </div>
            <p className="text-xs font-mono text-foreground/80 break-all">
              {artistWallet || "— No configurada (wallet del artista en .env.local)"}
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              Red: Avalanche Fuji. Esta es la wallet del artista; el AVAX se envia aqui.
            </p>
          </div>

          {/* Splits Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t.purchase.revenueSplit}
            </h3>
            <div className="space-y-3">
              {breakdown.splits.map((split, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-border/20 rounded-lg border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {split.role || t.purchase.collaborator}
                      </span>
                      <span className="text-xs text-foreground/50">
                        ({split.percentage}%)
                      </span>
                    </div>
                    <div className="text-xs font-mono text-foreground/60 truncate">
                      {formatAddress(split.walletAddress)}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-semibold text-foreground">
                      ${formatUSDC(split.amount)} {t.general.usdc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-accent flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-foreground/70">
                <p className="font-medium text-foreground mb-1">
                  {t.purchase.testnetTitle}
                </p>
                <p>
                  {t.purchase.testnetDesc}
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {isSuccess && (
            <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-lg p-3 text-sm text-emerald-200">
              {t.purchase.paymentSuccess}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="px-6 py-2 border border-border rounded-lg hover:bg-border/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.purchase.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isBusy}
            className="px-6 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isProcessing ? t.purchase.processing : t.purchase.confirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}







