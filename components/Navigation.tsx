"use client";

import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Language } from "@/lib/i18n";

interface NavigationProps {
  locale: Language;
}

export default function Navigation({ locale }: NavigationProps) {
  const t = getTranslations(locale);
  const { ready, authenticated, login, logout } = useAuth();

  return (
    <nav className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/moc/MOC-logo.png"
              alt="Music on Chain"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.home}
            </Link>
            <Link
              href="/"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.artists}
            </Link>
            <Link
              href="/ai-guide"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.aiGuide}
            </Link>
            <Link
              href="/how-it-works"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.howItWorks}
            </Link>
            <LanguageSwitcher currentLocale={locale} />
            <Link
              href="/fan-dashboard"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.fanDashboard}
            </Link>
            <Link
              href="/dashboard"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.dashboard}
            </Link>
            {!authenticated ? (
              <button
                onClick={login}
                disabled={!ready}
                className="px-4 py-2 text-sm bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ready ? t.auth.signIn : t.auth.loading}
              </button>
            ) : (
              <button
                onClick={logout}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-border/50 transition-colors"
              >
                {t.auth.logout}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

