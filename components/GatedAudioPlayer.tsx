"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PREVIEW_SECONDS } from "@/data/artists";

interface GatedAudioPlayerProps {
  src: string;
  title: string;
  isOwned: boolean;
  previewSeconds?: number;
  /** Llamado al llegar al límite de preview (ej. abrir modal de compra). */
  onPreviewLimitReached?: () => void;
}

export default function GatedAudioPlayer({
  src,
  title,
  isOwned,
  previewSeconds = PREVIEW_SECONDS,
  onPreviewLimitReached,
}: GatedAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isOwned && audio.currentTime >= previewSeconds) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        onPreviewLimitReached?.();
      }
      setCurrentTime(audio.currentTime);
    };
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isOwned, previewSeconds, onPreviewLimitReached]);

  const enforceLimit = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isOwned) return;
    if (audio.currentTime >= previewSeconds) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      onPreviewLimitReached?.();
    }
  }, [isOwned, previewSeconds, onPreviewLimitReached]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const interval = setInterval(enforceLimit, 200);
    return () => clearInterval(interval);
  }, [enforceLimit]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (!isOwned && audio.currentTime >= previewSeconds) {
        audio.currentTime = 0;
      }
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayDuration = isOwned ? duration : Math.min(duration, previewSeconds);
  const atPreviewLimit = !isOwned && currentTime >= previewSeconds - 0.5;

  return (
    <div className="w-full">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3 bg-border/30 rounded-lg p-3">
        <button
          onClick={togglePlay}
          disabled={atPreviewLimit}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <svg
              className="w-5 h-5 text-background"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6 4h4v12H6V4zm4 0h4v12h-4V4z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-background ml-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6.5 4l9 6-9 6V4z" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground/60 mb-1 truncate">{title}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/70">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{
                  width:
                    displayDuration > 0
                      ? `${(currentTime / displayDuration) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <span className="text-xs text-foreground/70">
              {formatTime(displayDuration)}
              {!isOwned && (
                <span className="text-foreground/50 ml-1">(preview)</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
