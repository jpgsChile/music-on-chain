"use client";

import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import RoyaltyEngine from "@/components/royalty-engine/RoyaltyEngine";
import { StudioPageHeader } from "@/components/studio/StudioStates";

export default function StudioRoyaltiesPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.royalties;

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <RoyaltyEngine />
    </div>
  );
}
