"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

interface HeroBannerProps {
  lang?: Language;
}

export default function HeroBanner({ lang = "es" }: HeroBannerProps) {
  const t = getTranslations(lang);
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-accent/10 via-background to-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
            {t.hero.title}
          </h1>
          <p className="mt-4 sm:mt-5 text-lg sm:text-xl text-foreground/70">
            {t.hero.subtitle}
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-lg bg-accent text-background hover:bg-accent-hover transition-colors"
            >
              {t.hero.ctaExplore}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-lg border border-border bg-background hover:bg-border/30 transition-colors"
            >
              {t.hero.ctaArtist}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
