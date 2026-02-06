/**
 * Helpers de ownership (localStorage).
 * Key: music_on_chain_ownership
 */

const STORAGE_KEY = "music_on_chain_ownership";

export function userOwnsTrack(
  wallet: string,
  artist: string,
  trackId: string
): boolean {
  if (typeof window === "undefined") return false;

  const raw = localStorage.getItem(STORAGE_KEY) || "[]";
  let data: unknown[];
  try {
    data = JSON.parse(raw);
    if (!Array.isArray(data)) return false;
  } catch {
    return false;
  }

  const w = wallet.toLowerCase();
  const a = artist.toLowerCase();
  const t = trackId;

  return data.some((o: unknown) => {
    if (typeof o !== "object" || o === null) return false;
    const obj = o as Record<string, unknown>;
    const buyer = (obj.buyer ?? obj.wallet) as string | undefined;
    const art = (obj.artist ?? "") as string;
    const id = (obj.trackId ?? obj.track) as string | undefined;
    return (
      buyer?.toLowerCase() === w &&
      art?.toLowerCase() === a &&
      id === t
    );
  });
}
