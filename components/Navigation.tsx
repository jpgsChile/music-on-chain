"use client";

import Link from "next/link";
import WalletConnect from "./WalletConnect";
import { getTranslations } from "@/lib/i18n";

export default function Navigation() {
  const t = getTranslations("es");

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
            <WalletConnect />
          </div>
        </div>
      </div>
    </nav>
  );
}

