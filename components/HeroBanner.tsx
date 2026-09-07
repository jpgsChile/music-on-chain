"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

interface HeroBannerProps {
  lang?: Language;
}

const LOGO_SRC = "/assets/moc/moc-logo.png";

export default function HeroBanner({ lang = "es" }: HeroBannerProps) {
  const t = getTranslations(lang);
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-accent/10 via-background to-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-accent mb-4">
            {t.hero.eyebrow}
          </p>
          <Link
            href="/"
            className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg min-h-[72px] flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Music On Chain"
              className="w-full max-w-[280px] sm:max-w-[320px] h-auto mx-auto drop-shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:drop-shadow-[0_0_28px_rgba(34,211,238,0.35)] transition-shadow duration-300"
              width={320}
              height={80}
              fetchPriority="high"
            />
          </Link>
          <h1 className="mt-6 text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            {t.hero.title}
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-foreground/70">
            {t.hero.subtitle}
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-lg bg-accent text-background hover:bg-accent-hover transition-colors"
            >
              {t.hero.ctaArtist}
            </Link>
            <a
              href="#marketplace"
              className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-lg border border-border bg-background hover:bg-border/30 transition-colors"
            >
              {t.hero.ctaMarketplace}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
