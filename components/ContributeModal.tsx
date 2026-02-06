"use client";

import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useUsdcPayment } from "@/lib/blockchain/useUsdcPayment";
import { formatUSDC } from "@/lib/utils";
import type { Artist } from "@/data/artists";
import type { CrowdfundingCampaign } from "@/data/artists";
import type { CrowdfundingContribution } from "@/types/ownership";
import { addContribution } from "@/lib/crowdfunding";
import { getTranslations } from "@/lib/i18n";

interface ContributeModalProps {
  artist: Artist;
  campaign: CrowdfundingCampaign;
  artistWallet: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export default function ContributeModal({
  artist,
  campaign,
  artistWallet,
  isOpen,
  onClose,
  onSuccess,
}: ContributeModalProps) {
  const t = getTranslations("es");
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";
  const { payWithUsdc } = useUsdcPayment();
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isBusy = isProcessing || isSuccess;

  const effectiveAmount = customAmount.trim() ? Number(customAmount) : amount;
  const validAmount = effectiveAmount > 0 && Number.isFinite(effectiveAmount);

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setIsSuccess(false);
      setErrorMessage(null);
      setCustomAmount("");
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
    if (isBusy || !validAmount || !walletAddress) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const txHash = await payWithUsdc({
        to: artistWallet,
        amount: effectiveAmount,
      });
      const record: CrowdfundingContribution = {
        wallet: walletAddress,
        artist: artist.slug,
        campaignId: campaign.id,
        amount: effectiveAmount,
        txHash,
        chain: "base-sepolia",
        contributedAt: new Date().toISOString(),
      };
      addContribution(record);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error) {
      console.error(error);
      setErrorMessage(t.contributeModal.error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div className="bg-background border border-border rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">{t.contributeModal.title}</h2>
          <p className="text-sm text-foreground/70 mt-1">{campaign.title}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground/80">{t.contributeModal.amount}</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a) || setCustomAmount("")}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  !customAmount && amount === a
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-border hover:bg-border/30"
                }`}
              >
                {a} USDC
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-foreground/60 block mb-1">{t.contributeModal.customAmount}</label>
            <input
              type="number"
              min={1}
              step={1}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="e.g. 15"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            />
          </div>
          <p className="text-xs text-foreground/50">
            {t.contributeModal.fundsGoTo}
          </p>
          {errorMessage && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {errorMessage}
            </div>
          )}
          {isSuccess && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              {t.contributeModal.success}
            </div>
          )}
        </div>
        {!walletAddress && (
          <p className="text-sm text-amber-500/90">{t.contributeModal.connectWallet}</p>
        )}
        <div className="p-6 pt-0 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 border border-border rounded-lg hover:bg-border/30 disabled:opacity-50"
          >
            {t.contributeModal.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isBusy || !validAmount || !walletAddress}
            className="px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? t.contributeModal.processing : `${t.contributeModal.contribute} ${formatUSDC(effectiveAmount)} USDC`}
          </button>
        </div>
      </div>
    </div>
  );
}
