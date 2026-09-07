"use client";

import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import RoyaltyEngine from "@/components/royalty-engine/RoyaltyEngine";
import EconomicLedger from "@/components/economics/EconomicLedger";
import { StudioPageHeader } from "@/components/studio/StudioStates";

export default function StudioRoyaltiesPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.royalties;

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <EconomicLedger
        copy={{
          ledgerTitle: t.ledgerTitle,
          ledgerHint: t.ledgerHint,
          emptyLedger: t.emptyLedger,
          simulateRevenue: t.simulateRevenue,
          settle: t.settle,
          accrued: t.accrued,
          settled: t.settled,
          gross: t.gross,
          net: t.net,
          protocolFee: t.protocolFee,
          error: t.ledgerError,
        }}
      />
      <RoyaltyEngine />
    </div>
  );
}
