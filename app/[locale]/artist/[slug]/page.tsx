import Header from "@/components/header/Header";
import ArtistBio from "@/components/artist/ArtistBio";
import ArtistHero from "@/components/artist/ArtistHero";
import TrackList from "@/components/music/TrackList";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

const artistLinks = [
  { label: "Warpcast", href: "#" },
  { label: "Instagram", href: "#" },
];

const tracks = [
  {
    id: "1",
    title: "The Soul – Intro",
    type: "Demo",
    price: 1,
    previewUrl: "/preview1.mp3",
  },
  {
    id: "2",
    title: "Burn the Noise",
    type: "Album Track",
    price: 1,
    previewUrl: "/preview2.mp3",
  },
];

export default async function ArtistPage({
  params,
}: {
  params: { locale: Locale; slug: string };
}) {
  const dict = await getDictionary(params.locale);

  const modalContent = (
    <p className="text-sm leading-relaxed">
      {dict.header.modal.line1}
      <br />
      {dict.header.modal.line2.replace("{{percent}}", "98")}
      <br />
      {dict.header.modal.line3}
      <br />
      <strong>{dict.header.modal.line4}</strong>
    </p>
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <Header
        brand={dict.header.brand}
        whatIsLabel={dict.header.whatIs}
        signInLabel={dict.header.signIn}
        modalContent={modalContent}
        closeLabel={dict.header.modal.close}
      />

      <ArtistHero
        bannerUrl="/cleaver-banner.jpg"
        avatarUrl="/cleaver-avatar.jpg"
        name="CLEAVER"
        countryGenre={dict.hero.countryGenre}
        links={artistLinks}
      />

      <ArtistBio bio={dict.hero.bio} moreLabel={dict.hero.bioMore} />

      <section className="px-4 mt-6">
        <h2 className="text-xl font-semibold mb-4">{dict.music.store}</h2>
        <TrackList
          tracks={tracks}
          labels={{
            buy: dict.music.buy,
            previewOnly: dict.music.previewOnly,
          }}
          modalLabels={{
            confirm: dict.checkout.confirm,
            success: dict.checkout.success,
            close: dict.header.modal.close,
          }}
        />
      </section>
    </main>
  );
}
