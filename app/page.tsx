import { artists } from "@/data/artists";
import ArtistCard from "@/components/ArtistCard";
import HeroBanner from "@/components/HeroBanner";
import ProductHierarchy from "@/components/ProductHierarchy";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookie } from "@/lib/locale-server";
import Link from "next/link";

export default async function Home() {
  const locale = await getLocaleFromCookie();
  const t = getTranslations(locale);
  return (
    <div className="min-h-screen flex flex-col">
      <HeroBanner lang={locale} />
      <ProductHierarchy />
      <main
        id="marketplace"
        className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-[0.18em] text-foreground/45 mb-2">
            {t.marketplace.eyebrow}
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t.marketplace.title}
          </h2>
          <p className="text-foreground/60 mb-2 max-w-2xl">{t.marketplace.subtitle}</p>
          <p className="text-sm text-foreground/50 mb-2 max-w-2xl">
            {t.vc.surfaces.marketplace.thesis}
          </p>
          <p className="text-sm text-foreground/45 mb-6">
            {t.marketplace.countLabel.replace("{{count}}", String(artists.length))}
          </p>
          {artists.length === 0 ? (
            <div className="border border-border rounded-xl p-8 text-center max-w-lg">
              <p className="font-semibold text-foreground">{t.marketplace.empty}</p>
              <Link
                href="/dashboard/upload"
                className="inline-flex mt-4 px-5 py-2.5 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover"
              >
                {t.marketplace.emptyCta}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {artists.map((artist) => (
                <ArtistCard key={artist.slug} artist={artist} lang={locale} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
