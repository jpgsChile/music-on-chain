"use client";

import { Track } from "@/types";
import { calculatePurchaseBreakdown, formatUSDC } from "@/lib/purchase";
import { formatAddress } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useEffect, useState } from "react";
import { useNativePayment } from "@/lib/blockchain/useUsdcPayment";

function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
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
    >
      {copied ? copiedLabel : label}
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
  const [showDetails, setShowDetails] = useState(false);
  const isBusy = isProcessing || isSuccess;
  const artistWallet = track.artist.walletAddress;
  const amountToArtist = Number((track.price * 0.98).toFixed(6));

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setIsSuccess(false);
      setErrorMessage(null);
      setShowDetails(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBusy) onClose();
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

  const status = isSuccess
    ? t.purchase.statusSuccess
    : isProcessing
      ? t.purchase.statusProcessing
      : t.purchase.statusReady;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div className="bg-background border border-border rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="border-b border-border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/50 mb-1">
                {status}
              </p>
              <h2 className="text-xl font-bold text-foreground">
                {t.purchase.confirm}
              </h2>
              <p className="text-foreground/70 mt-1">
                {t.purchase.buying} <span className="text-foreground">{track.title}</span>
              </p>
            </div>
            {!isBusy && (
              <button
                onClick={onClose}
                className="text-foreground/50 hover:text-foreground transition-colors"
                aria-label={t.purchase.cancel}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-lg border border-border bg-border/20 p-4 flex items-center justify-between">
            <span className="text-sm text-foreground/70">{t.general.usdc}</span>
            <span className="text-2xl font-semibold text-foreground tabular-nums">
              ${formatUSDC(breakdown.trackPrice)}
            </span>
          </div>

          <p className="text-xs text-foreground/50">{t.purchase.testnetDesc}</p>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-sm text-accent hover:underline"
          >
            {showDetails ? t.purchase.hidePaymentDetails : t.purchase.showPaymentDetails}
          </button>

          {showDetails && (
            <div className="space-y-4 pt-1">
              <div className="bg-border/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">{t.purchase.trackPrice}</span>
                  <span>${formatUSDC(breakdown.trackPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">{t.purchase.platformFee}</span>
                  <span>-${formatUSDC(breakdown.platformFee)}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t border-border">
                  <span>{t.purchase.netAmount}</span>
                  <span>${formatUSDC(breakdown.netAmount)}</span>
                </div>
              </div>

              <div className="bg-border/20 rounded-lg p-4 border border-border/50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {t.purchase.destinationLabel}
                  </span>
                  <CopyButton
                    text={artistWallet}
                    label={t.fanWallet.copy}
                    copiedLabel={t.fanWallet.copied}
                  />
                </div>
                <p className="text-xs font-mono text-foreground/80 break-all">
                  {artistWallet || t.purchase.destinationMissing}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  {t.purchase.revenueSplit}
                </h3>
                <div className="space-y-2">
                  {breakdown.splits.map((split, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-border/20 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {split.role || t.purchase.collaborator}
                        </span>
                        <span className="text-foreground/50 ml-2">({split.percentage}%)</span>
                        <div className="text-xs font-mono text-foreground/50">
                          {formatAddress(split.walletAddress)}
                        </div>
                      </div>
                      <span>${formatUSDC(split.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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

        <div className="border-t border-border p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="px-5 py-2 border border-border rounded-lg hover:bg-border/50 transition-colors disabled:opacity-50"
          >
            {t.purchase.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isBusy}
            className="px-5 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 font-semibold"
          >
            {isProcessing
              ? t.purchase.processing
              : `${t.purchase.confirmButton} · $${formatUSDC(breakdown.trackPrice)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
