"use client";

import { Track, Sale } from "@/types";
import Image from "next/image";
import AudioPlayer from "./AudioPlayer";
import PurchaseModal from "./PurchaseModal";
import { formatDuration } from "@/lib/utils";
import { addMockSale } from "@/lib/mockSales";
import { getTranslations } from "@/lib/i18n";
import { useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";

interface TrackCardProps {
  track: Track;
  onPurchase?: (trackId: string, sale: Sale) => void;
  isOwned?: boolean;
}

export default function TrackCard({ track, onPurchase, isOwned }: TrackCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { ready, authenticated, login, user } = useAuth();
  const t = getTranslations("es");
  const owned = Boolean(isOwned);

  const handleBuyClick = () => {
    if (!ready || owned) return;
    if (!authenticated) {
      login();
      return;
    }
    setShowModal(true);
  };

  const handlePurchaseSuccess = (txHash: string) => {
    const buyerAddress =
      user?.wallet?.address || user?.id || "privy-user";

    // Create mock sale
    const sale: Sale = {
      id: `sale-${Date.now()}-${track.id}`,
      trackId: track.id,
      buyerAddress,
      sellerAddress: track.artist.walletAddress,
      amount: track.price,
      timestamp: new Date().toISOString(),
      transactionHash: txHash,
    };

    // Save to mock state
    addMockSale(sale);

    setShowCelebration(true);

    window.setTimeout(() => {
      setShowCelebration(false);
    }, 2200);

    if (onPurchase) {
      onPurchase(track.id, sale);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleMockDownload = () => {
    if (!owned) return;
    const fileName = `${track.title}-${track.id}.${track.format.toLowerCase()}`;
    const blob = new Blob(
      [`Mock download for ${track.title} (${track.format}).`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
                {track.type && (
                  <span className="px-2 py-1 bg-border/60 text-foreground/70 rounded text-xs font-medium uppercase">
                    {track.type}
                  </span>
                )}
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
                disabled={!ready || owned}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  owned
                    ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed"
                    : "bg-accent text-background hover:bg-accent-hover"
                }`}
              >
                {owned
                  ? t.tracks.purchased
                  : t.tracks.buy}
              </button>
              <button
                onClick={handleMockDownload}
                disabled={!owned}
                className={`mt-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  owned
                    ? "border border-accent/40 text-accent hover:bg-accent/10"
                    : "border border-border/60 text-foreground/40 cursor-not-allowed"
                }`}
              >
                {owned ? t.tracks.download : t.tracks.downloadLocked}
              </button>
            </div>
          </div>

          {showCelebration && (
            <div className="mt-3 flex items-center gap-2 text-sm text-accent">
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                <span className="absolute h-1 w-1 rounded-full bg-green-400 -translate-x-2 -translate-y-1 animate-bounce" />
                <span className="absolute h-1 w-1 rounded-full bg-purple-400 translate-x-2 translate-y-1 animate-bounce" />
              </span>
              {t.tracks.purchaseSuccess}
            </div>
          )}

          {/* Audio Player */}
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-foreground/60">
              <span className="rounded-full bg-border/60 px-2 py-0.5">
                {owned ? t.tracks.ownedBadge : t.tracks.preview}
              </span>
            </div>
            <AudioPlayer
              src={track.previewUrl}
              title={`${track.title} - ${
                owned ? t.tracks.ownedBadge : t.tracks.preview
              }`}
            />
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        track={track}
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}

