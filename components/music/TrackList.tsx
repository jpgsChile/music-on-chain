"use client";

import { useMemo, useState } from "react";

import BuyModal from "@/components/ui/BuyModal";

import TrackRow from "./TrackRow";
import { useAudioPlayer } from "./useAudioPlayer";

type Track = {
  id: string;
  title: string;
  type: string;
  price: number;
  previewUrl: string;
};

type TrackListProps = {
  tracks: Track[];
  labels: {
    buy: string;
    previewOnly: string;
  };
  modalLabels: {
    confirm: string;
    success: string;
    close: string;
  };
};

const formatPrice = (price: number) => price.toFixed(2);

const buildBuyLabel = (template: string, price: number) =>
  template.replace("{{price}}", formatPrice(price));

export default function TrackList({ tracks, labels, modalLabels }: TrackListProps) {
  const { playPreview, playingId } = useAudioPlayer();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const modalPriceLabel = useMemo(() => {
    if (!selectedTrack) {
      return "";
    }
    return buildBuyLabel(labels.buy, selectedTrack.price);
  }, [labels.buy, selectedTrack]);

  const handleBuy = (track: Track) => {
    setSelectedTrack(track);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {tracks.map((track) => (
          <TrackRow
            key={track.id}
            title={track.title}
            type={track.type}
            previewLabel={labels.previewOnly}
            buyLabel={buildBuyLabel(labels.buy, track.price)}
            isPlaying={playingId === track.id}
            onPreview={() => playPreview(track.id, track.previewUrl)}
            onBuy={() => handleBuy(track)}
          />
        ))}
      </div>

      <BuyModal
        open={modalOpen}
        onClose={handleClose}
        title={modalLabels.confirm}
        confirmLabel={modalLabels.confirm}
        successLabel={modalLabels.success}
        closeLabel={modalLabels.close}
        trackTitle={selectedTrack?.title ?? ""}
        priceLabel={modalPriceLabel}
      />
    </>
  );
}
