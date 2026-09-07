"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

export default function SupportPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const s = t.support;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-accent mb-3">
          {s.eyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {s.title}
        </h1>
        <p className="text-foreground/70 text-lg mb-10">{s.subtitle}</p>

        <ul className="space-y-6 mb-12">
          <li className="border border-border rounded-xl p-5 bg-background">
            <h2 className="font-semibold text-foreground">{s.artistsTitle}</h2>
            <p className="mt-2 text-sm text-foreground/65">{s.artistsBody}</p>
            <Link
              href="/dashboard"
              className="inline-flex mt-4 text-sm text-accent hover:underline"
            >
              {s.artistsCta}
            </Link>
          </li>
          <li className="border border-border rounded-xl p-5 bg-background">
            <h2 className="font-semibold text-foreground">{s.fansTitle}</h2>
            <p className="mt-2 text-sm text-foreground/65">{s.fansBody}</p>
            <Link
              href="/fan-dashboard"
              className="inline-flex mt-4 text-sm text-accent hover:underline"
            >
              {s.fansCta}
            </Link>
          </li>
          <li className="border border-border rounded-xl p-5 bg-background">
            <h2 className="font-semibold text-foreground">{s.marketplaceTitle}</h2>
            <p className="mt-2 text-sm text-foreground/65">{s.marketplaceBody}</p>
            <Link
              href="/#marketplace"
              className="inline-flex mt-4 text-sm text-accent hover:underline"
            >
              {s.marketplaceCta}
            </Link>
          </li>
        </ul>

        <div className="border border-border rounded-xl p-6 bg-border/10">
          <h2 className="font-semibold text-foreground mb-2">{s.contactTitle}</h2>
          <p className="text-sm text-foreground/70">{s.contactBody}</p>
        </div>
      </div>
    </div>
  );
}
