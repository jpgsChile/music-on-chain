import { cookies } from "next/headers";
import type { Language } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale";

export async function getLocaleFromCookie(): Promise<Language> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "en" ? "en" : "es";
}
