import { artists } from "@/data/artists";
import ArtistCard from "@/components/ArtistCard";
import HeroBanner from "@/components/HeroBanner";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookie } from "@/lib/locale-server";

export default async function Home() {
  const locale = await getLocaleFromCookie();
  const t = getTranslations(locale);
  return (
    <div className="min-h-screen flex flex-col">
      <HeroBanner lang={locale} />
      <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {t.artists.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.slug} artist={artist} lang={locale} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
