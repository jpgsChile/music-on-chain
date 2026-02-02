import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

const getLocaleFromHeader = (acceptLanguage: string | null): Locale => {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const preferences = acceptLanguage
    .split(",")
    .map((value) => value.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const lang of preferences) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }

    const base = lang.split("-")[0];
    if (locales.includes(base as Locale)) {
      return base as Locale;
    }
  }

  return defaultLocale;
};

export default function RootRedirect() {
  const locale = getLocaleFromHeader(headers().get("accept-language"));
  redirect(`/${locale}`);
}
