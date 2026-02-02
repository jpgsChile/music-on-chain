import Header from "@/components/header/Header";
import ArtistHero from "@/components/artist/ArtistHero";
import TrackList from "@/components/music/TrackList";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function ArtistPage({
  params,
}: {
  params: { locale: Locale; slug: string };
}) {
  const dict = await getDictionary(params.locale);

  return (
    <main className="min-h-screen bg-black text-white">
      <Header dict={dict} />
      <ArtistHero dict={dict} />

      <section className="px-4 mt-6">
        <h2 className="text-xl font-semibold mb-4">{dict.music.store}</h2>
        <TrackList dict={dict} />
      </section>
    </main>
  );
}
