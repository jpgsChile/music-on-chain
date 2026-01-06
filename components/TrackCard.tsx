"use client";

import { Track, Sale } from "@/types";
import Image from "next/image";
import AudioPlayer from "./AudioPlayer";
import PurchaseModal from "./PurchaseModal";
import { formatDuration } from "@/lib/utils";
import { addMockSale } from "@/lib/mockSales";
import { getTranslations } from "@/lib/i18n";
import { useAccount } from "wagmi";
import { useState } from "react";

interface TrackCardProps {
  track: Track;
  onPurchase?: (trackId: string, sale: Sale) => void;
}

export default function TrackCard({ track, onPurchase }: TrackCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const { address } = useAccount();
  const t = getTranslations("es");

  const handleBuyClick = () => {
    if (purchased || isPurchasing) return;
    if (!address) {
      // In a real app, you might show a toast or redirect to connect wallet
      alert(t.purchase.pleaseConnect);
      return;
    }
    setShowModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (purchased || isPurchasing || !address) return;

    setIsPurchasing(true);

    // Simulate purchase processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create mock sale
    const sale: Sale = {
      id: `sale-${Date.now()}-${track.id}`,
      trackId: track.id,
      buyerAddress: address,
      sellerAddress: track.artist.walletAddress,
      amount: track.price,
      timestamp: new Date().toISOString(),
      transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, "0")}`,
    };

    // Save to mock state
    addMockSale(sale);

    setIsPurchasing(false);
    setPurchased(true);
    setShowModal(false);

    if (onPurchase) {
      onPurchase(track.id, sale);
    }
  };

  const handleCloseModal = () => {
    if (!isPurchasing) {
      setShowModal(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-6 bg-background hover:border-accent/30 transition-colors">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Cover Art */}
        {track.coverArt && (
          <div className="flex-shrink-0">
            <Image
              src={track.coverArt}
              alt={track.title}
              width={128}
              height={128}
              className="w-full sm:w-32 h-32 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-foreground mb-1 truncate">
                {track.title}
              </h3>
              <p className="text-sm text-foreground/70 mb-2">
                {track.artist.name}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/60">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {formatDuration(track.duration)}
                </span>
                <span className="px-2 py-1 bg-accent/10 text-accent rounded text-xs font-medium">
                  {track.format}
                </span>
                {track.genre && (
                  <span className="text-foreground/50">{track.genre}</span>
                )}
              </div>
            </div>

            {/* Price and Buy Button */}
            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-bold text-foreground mb-2">
                ${track.price.toFixed(2)}
              </div>
              <div className="text-xs text-foreground/60 mb-3">{t.general.usdc}</div>
              <button
                onClick={handleBuyClick}
                disabled={isPurchasing || purchased}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  purchased
                    ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed"
                    : isPurchasing
                    ? "bg-accent/50 text-background cursor-wait"
                    : "bg-accent text-background hover:bg-accent-hover"
                }`}
              >
                {purchased
                  ? t.tracks.purchased
                  : isPurchasing
                  ? t.tracks.processing
                  : t.tracks.buy}
              </button>
            </div>
          </div>

          {/* Audio Player */}
          <div className="mt-4">
            <AudioPlayer src={track.previewUrl} title={`${track.title} - Preview`} />
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        track={track}
        isOpen={showModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmPurchase}
        isProcessing={isPurchasing}
      />
    </div>
  );
}

