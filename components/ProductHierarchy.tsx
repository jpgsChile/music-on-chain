"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

/** Product pillars — publish, sell, monetize. No protocol jargon. */
const PILLARS = [
  { id: "publish", href: "/dashboard/release" },
  { id: "sell", href: "/#marketplace" },
  { id: "monetize", href: "/dashboard" },
  { id: "fans", href: "/fan-dashboard" },
] as const;

export default function ProductHierarchy() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const h = t.hierarchy;
  const pillars = t.product.pillars;

  return (
    <section className="border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/45 mb-2">
          {h.eyebrow}
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground max-w-2xl">
          {h.title}
        </h2>
        <p className="mt-2 text-sm text-foreground/60 max-w-xl">{h.subtitle}</p>

        <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PILLARS.map((item, index) => {
            const s = pillars[item.id];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block h-full rounded-xl border border-border p-4 hover:border-accent/40 transition-colors"
                >
                  <span className="text-[11px] font-mono text-foreground/40">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 font-medium text-foreground">{s.title}</p>
                  <p className="mt-1 text-sm text-foreground/55 leading-snug">
                    {s.body}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
