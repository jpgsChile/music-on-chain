"use client";

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Renders user-provided evidence as plain text or a safe external link. Never as HTML. */
export function EvidenceBody({ text, openLabel }: { text: string; openLabel: string }) {
  const trimmed = text.trim();
  if (isHttpUrl(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block break-all text-accent underline"
      >
        {openLabel}
      </a>
    );
  }
  return <p className="mt-1 whitespace-pre-wrap break-words text-foreground/85">{trimmed}</p>;
}
