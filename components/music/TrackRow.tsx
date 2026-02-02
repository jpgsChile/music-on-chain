type TrackRowProps = {
  title: string;
  type: string;
  previewLabel: string;
  buyLabel: string;
  isPlaying: boolean;
  onPreview: () => void;
  onBuy: () => void;
};

export default function TrackRow({
  title,
  type,
  previewLabel,
  buyLabel,
  isPlaying,
  onPreview,
  onBuy,
}: TrackRowProps) {
  return (
    <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs opacity-60">{type}</p>
        <p className="text-[11px] opacity-50 mt-1">{previewLabel}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPreview}
          className="text-sm"
          aria-label={previewLabel}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <button
          onClick={onBuy}
          className="bg-green-400 text-black px-3 py-1 rounded-full text-sm"
        >
          {buyLabel}
        </button>
      </div>
    </div>
  );
}
