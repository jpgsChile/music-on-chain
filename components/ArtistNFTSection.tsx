"use client";

import type { Artist } from "@/data/artists";
import type { ArtistNFT } from "@/data/artists";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

interface ArtistNFTSectionProps {
  artist: Artist;
  nfts: ArtistNFT[];
}

export default function ArtistNFTSection({ artist, nfts }: ArtistNFTSectionProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const UTILITY_LABELS: Record<ArtistNFT["utility"], string> = {
    ticket: t.nft.ticket,
    access: t.nft.access,
    membership: t.nft.membership,
  };
  if (!nfts?.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t.nft.sectionTitle}</h2>
      <p className="text-sm text-foreground/60">
        {t.nft.sectionDesc}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {nfts.map((nft) => (
          <li
            key={nft.id}
            className="border border-border rounded-xl p-4 bg-border/10"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">{nft.name}</h3>
                <p className="text-xs text-foreground/60 mt-0.5">{nft.description}</p>
                <span className="inline-block mt-2 text-xs text-accent">
                  {UTILITY_LABELS[nft.utility]}
                </span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">{nft.price} USDC</p>
                <p className="text-xs text-foreground/50">{t.nft.supply}: {nft.supply}</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="mt-4 w-full px-4 py-2 border border-border rounded-lg text-foreground/60 text-sm cursor-not-allowed"
            >
              {t.nft.mintComingSoon}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
