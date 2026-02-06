import { artists } from "@/data/artists";
import ArtistCard from "@/components/ArtistCard";
import { getTranslations } from "@/lib/i18n";

export default function ArtistsPage() {
  const t = getTranslations("es");

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">{t.artists.title}</h1>
          <p className="text-foreground/70 text-lg">
            {t.artists.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <ArtistCard key={artist.slug} artist={artist} />
          ))}
        </div>
      </div>
    </div>
  );
}

