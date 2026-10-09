"use client";

import Link from "next/link";
import { stellarExpertTransactionUrl } from "@/lib/fan-economy/materialization/presentation";
import { getTranslations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

interface HeroBannerProps {
  lang?: Language;
}

/** Certified lock transaction. The explorer URL exists only if the Testnet guard accepts it. */
const CERTIFIED_LOCK_TRANSACTION = "fcb8bb94eec5be7e853c2db3d59a83dbca6a5c7e3c22079e2f33dba6fc3c2119";

export default function HeroBanner({ lang = "es" }: HeroBannerProps) {
  const t = getTranslations(lang);
  const verifyUrl = stellarExpertTransactionUrl("testnet", CERTIFIED_LOCK_TRANSACTION);

  return (
    <section className="relative w-full overflow-hidden border-b border-border bg-gradient-to-b from-accent/10 via-background to-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">{t.hero.judgeEyebrow}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t.hero.judgeTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-foreground/70 sm:text-lg">{t.hero.judgeSubtitle}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-border/20 px-5 py-6 text-center sm:px-8 sm:py-8">
          <p className="text-sm font-medium text-foreground">
            <span className="mr-2 text-accent" aria-hidden="true">
              ✓
            </span>
            {t.hero.demoEyebrow}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{t.hero.demoAmount}</p>
          <p className="mt-2 text-sm text-foreground/60">{t.hero.demoStatus}</p>
          <Link
            href="/demo/stellar-proof"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-base font-medium text-background transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t.hero.demoCta}
          </Link>
          <p className="mt-3 text-xs text-foreground/45">{t.hero.demoNote}</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-5 text-left">
            <p className="font-semibold text-foreground">{t.hero.exploreTitle}</p>
            <p className="mt-2 text-sm text-foreground/70">{t.hero.exploreBody}</p>
            <div className="mt-4 flex flex-col items-start gap-2 text-sm">
              <a href="#marketplace" className="underline-offset-4 hover:underline">
                {t.hero.ctaMarketplace}
              </a>
              <Link href="/dashboard" className="underline-offset-4 hover:underline">
                {t.hero.ctaArtist}
              </Link>
            </div>
            <p className="mt-4 text-xs text-foreground/45">{t.hero.exploreNote}</p>
          </div>
          {verifyUrl ? (
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-border p-5 text-left transition-colors hover:bg-border/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <p className="font-semibold text-foreground">{t.hero.verifyTitle}</p>
              <p className="mt-2 text-sm text-foreground/70">{t.hero.verifyBody}</p>
              <p className="mt-4 text-xs text-foreground/45">{t.hero.verifyNote}</p>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
