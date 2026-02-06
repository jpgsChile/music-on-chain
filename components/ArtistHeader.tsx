import Image from "next/image";
import Link from "next/link";
import type { Artist } from "@/data/artists";
import ArtistSocials from "@/components/ArtistSocials";
import { getTranslations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

interface ArtistHeaderProps {
  artist: Artist;
  lang?: Language;
}

export default function ArtistHeader({ artist, lang = "es" }: ArtistHeaderProps) {
  const t = getTranslations(lang);
  return (
    <>
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          ← {t.artistPage.backToArtists}
        </Link>
      </div>
      <header className="relative w-full aspect-[21/9] max-h-[320px] rounded-xl overflow-hidden bg-border">
        <Image
          src={artist.coverUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-background/80 border-2 border-background/80 flex-shrink-0 aspect-square">
            <Image
              src={artist.logoUrl || "/avatars/default.svg"}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {artist.name}
            </h1>
            <p className="text-foreground/80 text-sm mt-0.5">{artist.description}</p>
          </div>
        </div>
      </header>
      {artist.socials && Object.values(artist.socials).some(Boolean) && (
        <div className="mt-4">
          <ArtistSocials socials={artist.socials} />
        </div>
      )}
    </>
  );
}
