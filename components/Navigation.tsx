"use client";

import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ConnectArtist from "@/components/ConnectArtist";
import type { Language } from "@/lib/i18n";

interface NavigationProps {
  locale: Language;
}

export default function Navigation({ locale }: NavigationProps) {
  const t = getTranslations(locale);
  const { authenticated, logout } = useAuth();

  const links = [
    { href: "/artists", label: t.nav.artists },
    { href: "/#marketplace", label: t.nav.marketplace },
    { href: "/fan-dashboard", label: t.nav.fan },
    { href: "/dashboard", label: t.nav.artistStudio },
    { href: "/about", label: t.nav.about },
    { href: "/support", label: t.nav.support },
  ] as const;

  return (
    <nav className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/assets/moc/moc-logo.png"
              alt="Music On Chain"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex gap-3 lg:gap-5 items-center flex-wrap justify-end">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <LanguageSwitcher currentLocale={locale} />
            {!authenticated ? (
              <ConnectArtist
                variant="modal"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent-hover transition-colors"
              />
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
