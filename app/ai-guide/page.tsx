"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

type Role = "artist" | "fan" | null;

export default function AIGuidePage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const [role, setRole] = useState<Role>(null);

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            {t.howItWorks.backHome}
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t.guide.title}
        </h1>
        <p className="text-foreground/70 mb-10">
          {t.guide.subtitle}
        </p>

        {role === null ? (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t.guide.areYou}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("artist")}
                className="p-6 rounded-xl border-2 border-border bg-border/10 hover:border-accent hover:bg-accent/5 transition-all text-left group"
              >
                <span className="text-2xl mb-2 block" aria-hidden>🎸</span>
                <span className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors">
                  {t.guide.iAmArtist}
                </span>
                <p className="text-sm text-foreground/60 mt-2">
                  {t.guide.iAmArtistDesc}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRole("fan")}
                className="p-6 rounded-xl border-2 border-border bg-border/10 hover:border-accent hover:bg-accent/5 transition-all text-left group"
              >
                <span className="text-2xl mb-2 block" aria-hidden>🎧</span>
                <span className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors">
                  {t.guide.iAmFan}
                </span>
                <p className="text-sm text-foreground/60 mt-2">
                  {t.guide.iAmFanDesc}
                </p>
              </button>
            </div>
          </section>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setRole(null)}
              className="text-sm text-foreground/60 hover:text-foreground mb-6"
            >
              {t.guide.changeChoice}
            </button>

            {role === "artist" && (
              <section className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {t.guide.forArtistsTitle}
                  </h2>
                  <p className="text-foreground/80">
                    {t.guide.forArtistsIntro}
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/assets/artists/artist1.png"
                    alt=""
                    width={800}
                    height={450}
                    className="w-full h-auto aspect-video object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">{t.guide.forArtistsWhat}</h3>
                  <ul className="space-y-2 text-foreground/80">
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.sellTracks}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.crowdfundingItem}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.nftsItem}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.socialsItem}
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/assets/artists/artist2.png"
                    alt=""
                    width={800}
                    height={450}
                    className="w-full h-auto aspect-video object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-sm text-foreground/90">
                    <strong>{t.guide.exampleLabel}:</strong> {t.guide.exampleArtist}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/dashboard" className="px-5 py-2.5 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover transition-colors">
                    {t.nav.artistPortal}
                  </Link>
                  <Link href="/dashboard/upload" className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors">
                    {t.dashboard.primaryPublish}
                  </Link>
                  <Link href="/how-it-works" className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors">
                    {t.guide.footerHow}
                  </Link>
                </div>
              </section>
            )}

            {role === "fan" && (
              <section className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {t.guide.forFansTitle}
                  </h2>
                  <p className="text-foreground/80">
                    {t.guide.forFansIntro}
                  </p>
                </div>
                <div className="rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/assets/fans/fan1.png"
                    alt=""
                    width={800}
                    height={450}
                    className="w-full h-auto aspect-video object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">{t.guide.forArtistsWhat}</h3>
                  <ul className="space-y-2 text-foreground/80">
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.discoverArtists}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.buyTracksItem}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.contributeItem}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent">•</span>
                      {t.guide.collectNfts}
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/assets/fans/fan2.jpg"
                    alt=""
                    width={800}
                    height={450}
                    className="w-full h-auto aspect-video object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-sm text-foreground/90">
                    <strong>{t.guide.exampleLabel}:</strong> {t.guide.exampleFan}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/#marketplace" className="px-5 py-2.5 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover transition-colors">
                    {t.guide.exploreArtists}
                  </Link>
                  <Link href="/fan-dashboard" className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors">
                    {t.nav.fanPortal}
                  </Link>
                  <Link href="/how-it-works" className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors">
                    {t.guide.footerHow}
                  </Link>
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-16 pt-8 border-t border-border text-sm text-foreground/50">
          <Link href="/how-it-works" className="hover:text-foreground/70">{t.guide.footerHow}</Link>
          {" · "}
          <Link href="/" className="hover:text-foreground/70">{t.guide.footerHome}</Link>
        </footer>
      </div>
    </div>
  );
}
