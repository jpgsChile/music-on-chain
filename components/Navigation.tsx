"use client";

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/useAuth";

export default function Navigation() {
  const t = getTranslations("es");
  const { ready, authenticated, login, logout } = useAuth();

  return (
    <nav className="border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-foreground">
            Music on Chain
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/tracks"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.explore}
            </Link>
            <Link
              href="/artists"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {t.nav.artists}
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

