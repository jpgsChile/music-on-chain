"use client";

import { createContext, useContext } from "react";
import type { Language } from "@/lib/i18n";

const LocaleContext = createContext<Language>("es");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Language;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Language {
  return useContext(LocaleContext);
}
