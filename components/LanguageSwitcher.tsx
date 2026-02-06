"use client";

import { useRouter } from "next/navigation";
import type { Language } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale";

const STORAGE_KEY = "music_on_chain_locale";

function setLocaleCookie(lang: Language) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

interface LanguageSwitcherProps {
  currentLocale: Language;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();

  const switchTo = (next: Language) => {
    if (next === currentLocale) return;
    setLocaleCookie(next);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => switchTo("es")}
        className={`px-2 py-1 rounded transition-colors ${
          currentLocale === "es"
            ? "bg-accent/20 text-accent font-medium"
            : "text-foreground/60 hover:text-foreground"
        }`}
        aria-label="Español"
      >
        ES
      </button>
      <span className="text-foreground/40" aria-hidden>
        |
      </span>
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`px-2 py-1 rounded transition-colors ${
          currentLocale === "en"
            ? "bg-accent/20 text-accent font-medium"
            : "text-foreground/60 hover:text-foreground"
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
