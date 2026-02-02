"use client";

import { useAudioPlayer } from "./useAudioPlayer";

export default function TrackList({ dict }: { dict: any }) {
  const { playPreview, playingId } = useAudioPlayer();
  const tracks = Array.isArray(dict.music.tracks) ? dict.music.tracks : [];

  return (
    <div className="flex flex-col gap-4">
      {tracks.map((track: any) => (
        <div
          key={track.id}
          className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg"
        >
          <div>
            <p className="font-medium">{track.title}</p>
            <p className="text-xs opacity-60">{track.type}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => playPreview(track.id, track.preview)}
              className="text-sm"
            >
              {playingId === track.id ? "⏸" : "▶"}
            </button>

            <button className="bg-green-400 text-black px-3 py-1 rounded-full text-sm">
              {dict.music.buy.replace(
                "{{price}}",
                Number(track.price).toFixed(2),
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
