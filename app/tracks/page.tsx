"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

/** Legacy route — catalog lives in Marketplace (/#marketplace). */
export default function TracksPage() {
  const locale = useLocale();
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t.tracks.title}</h1>
        <p className="text-foreground/70 text-lg mb-6">{t.tracks.catalogHint}</p>
        <Link
          href="/#marketplace"
          className="inline-flex px-5 py-2.5 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover"
        >
          {t.tracks.goMarketplace}
        </Link>
      </div>
    </div>
  );
}
