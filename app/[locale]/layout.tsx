import type { ReactNode } from "react";

import { locales, type Locale } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: Locale };
}) {
  return (
    <div lang={params.locale} data-locale={params.locale}>
      {children}
    </div>
  );
}
