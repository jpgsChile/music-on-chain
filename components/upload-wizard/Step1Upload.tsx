"use client";

import { useCallback, useRef } from "react";
import { getAcceptedAudioTypes } from "@/lib/upload/validation";

interface Step1UploadProps {
  audioFile: File | null;
  onFileChange: (file: File | null, previewUrl: string | null) => void;
  error?: string;
  t: Record<string, string>;
}

export default function Step1Upload({ audioFile, onFileChange, error, t }: Step1UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      let previewUrl: string | null = null;
      if (file) previewUrl = URL.createObjectURL(file);
      onFileChange(file, previewUrl);
    },
    [onFileChange]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("audio/")) handleFile(f);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70">{t.step1Desc}</p>
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50"
      >
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptedAudioTypes()}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {audioFile ? (
          <div>
            <p className="font-medium text-foreground truncate">{audioFile.name}</p>
            <p className="text-xs text-foreground/50">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <button type="button" onClick={() => handleFile(null)} className="mt-2 text-sm text-accent hover:underline">
              {t.changeFile}
            </button>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => inputRef.current?.click()} className="text-accent hover:underline font-medium">
              {t.selectFile}
            </button>
            <p className="text-sm text-foreground/50 mt-1">{t.orDrop}</p>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
