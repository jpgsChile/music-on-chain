import Link from "next/link";
import { artists } from "@/data/artists";
import ArtistCard from "@/components/ArtistCard";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookie } from "@/lib/locale-server";

export default async function ArtistsPage() {
  const locale = await getLocaleFromCookie();
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/#marketplace"
            className="text-sm text-foreground/60 hover:text-foreground mb-3 inline-block"
          >
            {t.artists.backToArtists}
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">{t.artists.title}</h1>
          <p className="text-foreground/70 text-lg">{t.artists.subtitle}</p>
          <p className="mt-2 text-sm text-foreground/45">
            {t.artists.countLabel.replace("{{count}}", String(artists.length))}
          </p>
        </div>

        {artists.length === 0 ? (
          <div className="border border-border rounded-xl p-8 text-center max-w-lg">
            <p className="font-semibold text-foreground">{t.artists.empty}</p>
            <Link
              href="/about"
              className="inline-flex mt-4 px-5 py-2.5 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover"
            >
              {t.artists.emptyCta}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.slug} artist={artist} lang={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
