import Link from "next/link";
import { getTranslations } from "@/lib/i18n";

export default function Home() {
  const t = getTranslations("es");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="block text-foreground">{t.landing.title1}</span>
            <span className="block text-foreground mt-2">{t.landing.title2}</span>
            <span className="block text-accent mt-2">{t.landing.title3}</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-foreground/70 max-w-2xl mx-auto">
            {t.landing.subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/artists"
              className="w-full sm:w-auto px-8 py-4 bg-accent text-background font-semibold rounded-lg hover:bg-accent-hover transition-colors duration-200 shadow-lg shadow-accent/20"
            >
              {t.landing.ctaArtist}
            </Link>
            <Link
              href="/tracks"
              className="w-full sm:w-auto px-8 py-4 border border-border text-foreground font-semibold rounded-lg hover:bg-border/50 transition-colors duration-200"
            >
              {t.landing.ctaExplore}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-sm text-foreground/50">
          <p>{t.landing.footer}</p>
        </div>
      </footer>
    </div>
  );
}
