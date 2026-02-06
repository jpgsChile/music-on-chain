import Link from "next/link";
import Image from "next/image";
import type { Artist } from "@/data/artists";
import { getTranslations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

interface ArtistCardProps {
  artist: Artist;
  lang?: Language;
}

export default function ArtistCard({ artist, lang = "es" }: ArtistCardProps) {
  const t = getTranslations(lang);
  return (
    <Link
      href={`/artist/${artist.slug}`}
      className="block border border-border rounded-xl overflow-hidden bg-background hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="flex flex-col items-center pt-6 pb-2 px-4">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-full overflow-hidden bg-border/30 aspect-square">
          <Image
            src={artist.logoUrl || "/avatars/default.svg"}
            alt=""
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>
        <span className="mt-3 text-sm font-medium text-foreground/90">
          {t.artistPage.viewArtist} →
        </span>
      </div>
      <div className="p-4 pt-0">
        <h3 className="text-lg font-semibold text-foreground">{artist.name}</h3>
        <p className="text-sm text-foreground/60 line-clamp-2 mt-1">
          {artist.description}
        </p>
      </div>
    </Link>
  );
}
