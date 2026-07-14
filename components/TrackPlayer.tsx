"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useWallets } from "@privy-io/react-auth";
import { userOwnsTrack } from "@/lib/ownership";
import { useTrackOwnership } from "@/lib/ownership/useTrackOwnership";
import type { TrackOwnership } from "@/types/ownership";
import type { Artist, Track } from "@/data/artists";
import { buildTrackForPurchase } from "@/lib/buildTrackForPurchase";
import GatedAudioPlayer from "@/components/GatedAudioPlayer";
import PurchaseModal from "@/components/PurchaseModal";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";

export interface TrackPlayerProps {
  artist: Artist;
  track: Track;
  /** Optional wallet override (e.g. from server env for cleaver). */
  artistWalletOverride?: string;
}

export default function TrackPlayer({
  artist,
  track,
  artistWalletOverride,
}: TrackPlayerProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { ready, login } = useAuth();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";
  const { addOwnership } = useTrackOwnership();
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [justPurchased, setJustPurchased] = useState(false);

  const isOwned = Boolean(
    walletAddress && userOwnsTrack(walletAddress, artist.slug, track.id)
  );

  const legacyTrack = useMemo(
    () => buildTrackForPurchase(artist, track, artistWalletOverride),
    [artist, track, artistWalletOverride]
  );

  const handlePurchaseSuccess = (txHash: string) => {
    if (!walletAddress) return;
    const record: TrackOwnership = {
      buyer: walletAddress,
      artist: artist.slug,
      trackId: track.id,
      txHash,
      chain: "base-sepolia",
      purchasedAt: new Date().toISOString(),
    };
    addOwnership(record);
    setJustPurchased(true);
    setPurchaseModalOpen(false);
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-border/10">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="font-medium text-foreground">{track.title}</span>
        <span className="text-sm text-foreground/70">
          {track.price} {track.currency}
        </span>
      </div>
      <div className="mb-3">
        {!walletAddress ? (
          <p className="text-sm text-foreground/50">{t.artistPage.connectToListen}</p>
        ) : isOwned || justPurchased ? (
          <p className="text-sm text-green-500">{t.artistPage.ownedFullAccess}</p>
        ) : (
          <p className="text-sm text-yellow-400">
            {t.artistPage.previewBuy} {track.price} {track.currency}
          </p>
        )}
      </div>
      {justPurchased && (
        <div className="mb-3 text-sm">
          <p className="text-emerald-600">{t.artistPage.purchaseSuccessBanner}</p>
          <Link href="/fan-dashboard" className="text-accent hover:underline">
            {t.artistPage.goFanPortal}
          </Link>
        </div>
      )}
      {walletAddress && (
        <GatedAudioPlayer
          src={track.audioUrl}
          title={track.title}
          isOwned={isOwned || justPurchased}
          onPreviewLimitReached={() => setPurchaseModalOpen(true)}
        />
      )}
      {!walletAddress && (
        <button
          type="button"
          onClick={login}
          disabled={!ready}
          className="mt-3 w-full sm:w-auto px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50"
        >
          {ready ? t.auth.connectCta : t.auth.loading}
        </button>
      )}
      {!isOwned && !justPurchased && walletAddress && (
        <button
          type="button"
          onClick={() => setPurchaseModalOpen(true)}
          className="mt-3 w-full sm:w-auto px-4 py-2 bg-accent text-background text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
        >
          {t.artistPage.buyTrack}
        </button>
      )}
      <PurchaseModal
        track={legacyTrack}
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}
