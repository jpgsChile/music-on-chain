"use client";

import { useRef } from "react";
import type { ReleaseTrack, ReleaseValidationErrors } from "@/types/upload";
import { getAcceptedAudioTypes } from "@/lib/upload/validation";

type T = Record<string, string>;

interface Props {
  tracks: ReleaseTrack[];
  errors: ReleaseValidationErrors;
  t: T;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, partial: Partial<ReleaseTrack>) => void;
}

function formatDuration(sec: number | null) {
  if (sec == null || Number.isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

function TrackCard({
  track,
  index,
  canRemove,
  t,
  onRemove,
  onUpdate,
}: {
  track: ReleaseTrack;
  index: number;
  canRemove: boolean;
  t: T;
  onRemove: () => void;
  onUpdate: (partial: Partial<ReleaseTrack>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) {
      if (track.previewUrl) URL.revokeObjectURL(track.previewUrl);
      onUpdate({ file: null, previewUrl: null, durationSec: null });
      return;
    }
    if (track.previewUrl) URL.revokeObjectURL(track.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    const durationSec = await readDuration(file);
    onUpdate({
      file,
      previewUrl,
      durationSec,
      title: track.title || file.name.replace(/\.[^.]+$/, ""),
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {t.trackLabel} {index + 1}
        </p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-foreground/45 hover:text-red-400"
          >
            {t.removeTrack}
          </button>
        ) : null}
      </div>

      <div
        className="rounded-xl border border-dashed border-border px-4 py-5 text-center hover:border-accent/40 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptedAudioTypes()}
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
        {track.file ? (
          <div>
            <p className="text-sm font-medium text-foreground truncate">{track.file.name}</p>
            <p className="mt-1 text-xs text-foreground/45">
              {(track.file.size / (1024 * 1024)).toFixed(2)} MB · {formatDuration(track.durationSec)}
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 text-sm text-accent hover:underline"
            >
              {t.changeFile}
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-sm font-medium text-accent hover:underline"
            >
              {t.uploadWav}
            </button>
            <p className="mt-1 text-xs text-foreground/45">{t.wavHint}</p>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-foreground/70 mb-1">
            {t.trackTitle}
          </label>
          <input
            value={track.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder={t.trackTitlePlaceholder}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground/70 mb-1">
            {t.trackVersion}{" "}
            <span className="text-foreground/35">({t.optional})</span>
          </label>
          <input
            value={track.version}
            onChange={(e) => onUpdate({ version: e.target.value })}
            placeholder={t.trackVersionPlaceholder}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <p className="text-xs text-foreground/50">
          {t.duration}:{" "}
          <span className="font-mono text-foreground/80">
            {formatDuration(track.durationSec)}
          </span>
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={track.explicit}
            onChange={(e) => onUpdate({ explicit: e.target.checked })}
            className="rounded border-border"
          />
          {t.explicit}
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground/70 mb-1">
          {t.lyrics} <span className="text-foreground/35">({t.optional})</span>
        </label>
        <textarea
          value={track.lyrics}
          onChange={(e) => onUpdate({ lyrics: e.target.value })}
          rows={3}
          placeholder={t.lyricsPlaceholder}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </div>

      {track.previewUrl ? (
        <div>
          <p className="text-xs font-medium text-foreground/70 mb-1.5">{t.preview}</p>
          <audio controls src={track.previewUrl} className="w-full h-10" />
        </div>
      ) : null}
    </div>
  );
}

export default function StepTracks({
  tracks,
  errors,
  t,
  onAdd,
  onRemove,
  onUpdate,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t.step2Title}</h2>
        <p className="mt-1 text-sm text-foreground/55">{t.step2Desc}</p>
      </div>

      <div className="space-y-4">
        {tracks.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            index={i}
            canRemove={tracks.length > 1}
            t={t}
            onRemove={() => onRemove(track.id)}
            onUpdate={(partial) => onUpdate(track.id, partial)}
          />
        ))}
      </div>

      {(errors.tracks || errors.trackFile || errors.trackTitle) && (
        <p className="text-sm text-red-400">
          {errors.tracks || errors.trackFile || errors.trackTitle}
        </p>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="text-sm font-medium text-accent hover:underline"
      >
        + {t.addTrack}
      </button>
    </div>
  );
}
