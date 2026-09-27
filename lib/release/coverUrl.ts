/** Canonical release cover URL helpers. Rejects ephemeral browser blob: URLs. */

export const DEFAULT_RELEASE_COVER = "/covers/default.svg";

/**
 * Returns a browser-displayable cover URL, or null when none is durable.
 * Does not invent artwork for a specific release.
 */
export function resolveReleaseCoverUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  // createObjectURL previews — never durable across sessions / devices
  if (value.startsWith("blob:")) return null;
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return value;
  } catch {
    return null;
  }
  return null;
}

/** Display src: real cover when durable, otherwise the shared neutral placeholder. */
export function releaseCoverSrc(raw: string | null | undefined): string {
  return resolveReleaseCoverUrl(raw) ?? DEFAULT_RELEASE_COVER;
}
