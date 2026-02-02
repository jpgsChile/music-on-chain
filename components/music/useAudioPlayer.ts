import { useRef, useState } from "react";

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setPlayingId(null);
  };

  const playPreview = (id: string, url: string) => {
    if (playingId === id) {
      stopPreview();
      return;
    }

    stopPreview();

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(id);

    audio.play().catch(() => {
      stopPreview();
    });

    audio.onended = () => {
      stopPreview();
    };

    timeoutRef.current = setTimeout(() => {
      stopPreview();
    }, 30000);
  };

  return { playPreview, playingId, stopPreview };
}
