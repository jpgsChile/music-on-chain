import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookie } from "@/lib/locale-server";

export const metadata = {
  title: "Cómo funciona | Music On Chain Protocol",
  description:
    "Protocolo → SDK → Marketplace → Portales. Propiedad, licencias, distribución y liquidación.",
};

export default async function HowItWorksPage() {
  const locale = await getLocaleFromCookie();
  const t = getTranslations(locale);

  const steps = [
    { title: t.howItWorks.step1Title, body: t.howItWorks.step1Body },
    { title: t.howItWorks.step2Title, body: t.howItWorks.step2Body },
    { title: t.howItWorks.step3Title, body: t.howItWorks.step3Body },
    { title: t.howItWorks.step4Title, body: t.howItWorks.step4Body },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/"
          className="text-sm text-foreground/60 hover:text-foreground mb-8 inline-block"
        >
          {t.howItWorks.backHome}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t.howItWorks.title}
        </h1>
        <p className="text-foreground/70 mb-12">
          {t.howItWorks.subtitle}
        </p>

        <div className="space-y-8">
          {steps.map(({ title, body }, index) => (
            <div key={index} className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center">
                {index + 1}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {title}
                </h2>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl bg-border/20 border border-border">
          <h3 className="font-semibold text-foreground mb-2">{t.howItWorks.oneLiner}</h3>
          <p className="text-foreground/80 text-sm">
            {t.howItWorks.oneLinerText}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/ai-guide"
            className="px-5 py-2.5 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t.howItWorks.ctaGuide}
          </Link>
          <Link
            href="/protocol"
            className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors"
          >
            {t.howItWorks.ctaProtocol}
          </Link>
          <Link
            href="/#marketplace"
            className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors"
          >
            {t.howItWorks.ctaExplore}
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors"
          >
            {t.howItWorks.ctaArtist}
          </Link>
          <Link
            href="/fan-dashboard"
            className="px-5 py-2.5 border border-border rounded-lg hover:bg-border/30 transition-colors"
          >
            {t.howItWorks.ctaFan}
          </Link>
        </div>
      </div>
    </div>
  );
}
