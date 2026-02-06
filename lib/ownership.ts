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

  return data.some((o: Record<string, unknown>) => {
    const buyer = (o.buyer ?? o.wallet) as string | undefined;
    const art = (o.artist ?? "") as string;
    const id = (o.trackId ?? o.track) as string | undefined;
    return (
      buyer?.toLowerCase() === w &&
      art?.toLowerCase() === a &&
      id === t
    );
  });
}
