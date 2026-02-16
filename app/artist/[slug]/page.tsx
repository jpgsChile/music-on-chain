import { notFound } from "next/navigation";
import { artists, getArtistBySlug } from "@/data/artists";
import ArtistHeader from "@/components/ArtistHeader";
import TrackList from "@/components/TrackList";
import CrowdfundingCard from "@/components/CrowdfundingCard";
import ArtistEventsSection from "@/components/tickets/ArtistEventsSection";
import ArtistNFTSection from "@/components/ArtistNFTSection";
import ArtistProfilePublicSection from "@/components/artist-profile/ArtistProfilePublicSection";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookie } from "@/lib/locale-server";

export function generateStaticParams() {
  return artists.map((a) => ({ slug: a.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArtistPage({ params }: PageProps) {
  const locale = await getLocaleFromCookie();
  const t = getTranslations(locale);
  const { slug } = await params;
  const artist = getArtistBySlug(slug);
  if (!artist) notFound();

  const artistWalletOverride =
    artist.slug === "cleaver"
      ? (process.env.NEXT_PUBLIC_CLEAVER_WALLET ?? "").trim()
      : undefined;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <ArtistHeader artist={artist} lang={locale} />
        <div className="mt-8 space-y-10">
          <ArtistProfilePublicSection
            artistWallet={artistWalletOverride || artist.wallet}
          />
          <TrackList
            artist={artist}
            artistWalletOverride={artistWalletOverride || undefined}
          />
          {artist.crowdfunding && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">{t.crowdfunding.title}</h2>
              <CrowdfundingCard
                artist={artist}
                campaign={artist.crowdfunding}
                artistWalletOverride={artistWalletOverride || undefined}
              />
            </section>
          )}
          <ArtistEventsSection
            artist={artist}
            artistWalletOverride={artistWalletOverride || undefined}
          />
          {artist.nfts && artist.nfts.length > 0 && (
            <section>
              <ArtistNFTSection artist={artist} nfts={artist.nfts} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
