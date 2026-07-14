"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

/** VC demo map — each surface answers one investor question. */
const SURFACES = [
  { id: "protocol", href: "/protocol" },
  { id: "architecture", href: "/protocol#architecture" },
  { id: "settlement", href: "/protocol#chains" },
  { id: "sdk", href: "/protocol#console" },
  { id: "marketplace", href: "/#marketplace" },
  { id: "artistPortal", href: "/dashboard" },
  { id: "fanPortal", href: "/fan-dashboard" },
] as const;

export default function ProductHierarchy() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const h = t.hierarchy;
  const surfaces = t.vc.surfaces;

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

        <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SURFACES.map((item, index) => {
            const s = surfaces[item.id];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block h-full rounded-xl border border-border p-4 hover:border-accent/40 transition-colors"
                >
                  <span className="text-[11px] font-mono text-foreground/40">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 text-xs text-accent/90">{s.question}</p>
                  <p className="mt-1 font-medium text-foreground">{s.answer}</p>
                  <p className="mt-1 text-sm text-foreground/55 leading-snug">
                    {s.thesis}
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
