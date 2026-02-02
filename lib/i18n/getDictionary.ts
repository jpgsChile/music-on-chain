import "server-only";

import type { Locale } from "./config";
import type { default as EnDictionary } from "./dictionaries/en.json";

const dictionaries = {
  en: () => import("./dictionaries/en.json").then((module) => module.default),
  es: () => import("./dictionaries/es.json").then((module) => module.default),
};

export type Dictionary = EnDictionary;

export const getDictionary = async (locale: Locale) => dictionaries[locale]();
