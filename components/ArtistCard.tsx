import Link from "next/link";
import Image from "next/image";
import type { Artist } from "@/data/artists";
import { getTranslations } from "@/lib/i18n";

interface ArtistCardProps {
  artist: Artist;
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const t = getTranslations("es");
  return (
    <Link
      href={`/artist/${artist.slug}`}
      className="block border border-border rounded-xl overflow-hidden bg-background hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="aspect-[4/3] relative bg-border/30">
        <Image
          src={artist.coverUrl}
          alt={artist.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-3">
          <Image
            src={artist.logoUrl}
            alt=""
            width={64}
            height={64}
            className="h-12 w-auto object-contain drop-shadow-lg"
          />
          <span className="text-sm font-medium text-foreground/90 bg-background/80 px-3 py-1.5 rounded-lg">
            {t.artistPage.viewArtist} →
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground">{artist.name}</h3>
        <p className="text-sm text-foreground/60 line-clamp-2 mt-1">
          {artist.description}
        </p>
      </div>
    </Link>
  );
}
