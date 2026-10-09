"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

export default function TestnetProof({ story }: { story: "artist" | "fan" }) {
  const t = getTranslations(useLocale()).studio.fanEconomy;
  const steps = story === "artist" ? t.artistStory : t.fanStory;

  return (
    <section className="mt-8 rounded-2xl border border-border p-5">
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step} className="rounded-xl bg-border/20 px-3 py-2 text-sm">
            <span className="mr-2 text-foreground/40">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-foreground/70">{t.accountDemoUnavailable}</p>
      <Link href="/demo/stellar-proof" className="mt-2 inline-block text-sm text-accent underline-offset-4 hover:underline">
        {t.certifiedOperationCta}
      </Link>
      <p className="mt-1 text-xs text-foreground/50">{t.certifiedOperationNote}</p>
    </section>
  );
}
