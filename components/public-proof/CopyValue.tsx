"use client";

import { useState } from "react";

export default function CopyValue({ value, copyLabel, copiedLabel }: { value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:text-foreground"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
