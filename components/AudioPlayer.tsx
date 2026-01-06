"use client";

import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  src: string;
  title: string;
}

export default function AudioPlayer({ src, title }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
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
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
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

  return (
    <div className="w-full">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3 bg-border/30 rounded-lg p-3">
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
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
          <div className="text-xs text-foreground/60 mb-1 truncate">
            {title}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/70">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{
                  width: duration
                    ? `${(currentTime / duration) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <span className="text-xs text-foreground/70">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}











