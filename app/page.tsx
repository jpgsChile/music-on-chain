import { artists } from "@/data/artists";
import ArtistCard from "@/components/ArtistCard";
import { getTranslations } from "@/lib/i18n";

export default function Home() {
  const t = getTranslations("es");
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            {t.artists.title}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.slug} artist={artist} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
