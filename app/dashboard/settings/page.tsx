"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
import { getArtistByWallet } from "@/data/artists";
import { useArtistProfile } from "@/lib/artist-profile/useArtistProfile";
import {
  StudioLoading,
  StudioPageHeader,
  StudioProgress,
  StudioSuccess,
} from "@/components/studio/StudioStates";

export default function StudioSettingsPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.settings;
  const { user } = useAuth();
  const address = user?.wallet?.address || "";
  const artist = getArtistByWallet(address);
  const { profile, loading } = useArtistProfile(address);

  if (loading) return <StudioLoading label={t.loading} />;

  const essentials = [
    Boolean(profile?.artisticName?.trim()),
    Boolean(address),
    true,
  ].filter(Boolean).length;

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mb-6">
        <StudioProgress label={t.progressLabel} current={essentials} total={3} />
      </div>

      <StudioSuccess title={t.successTitle} description={t.emptyDesc} />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/channel"
          className="rounded-xl border border-border bg-background p-4 hover:border-accent/40 transition-colors"
        >
          <p className="font-medium text-foreground">{t.ctaChannel}</p>
        </Link>
        {artist ? (
          <Link
            href={`/artist/${artist.slug}`}
            className="rounded-xl border border-border bg-background p-4 hover:border-accent/40 transition-colors"
          >
            <p className="font-medium text-foreground">{t.ctaProfile}</p>
          </Link>
        ) : (
          <div className="rounded-xl border border-border bg-background p-4 opacity-50">
            <p className="font-medium text-foreground">{t.ctaProfile}</p>
          </div>
        )}
        <Link
          href="/support"
          className="rounded-xl border border-border bg-background p-4 hover:border-accent/40 transition-colors"
        >
          <p className="font-medium text-foreground">{t.ctaSupport}</p>
        </Link>
      </div>
    </div>
  );
}
