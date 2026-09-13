"use client";

import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
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
          emptyMovements: t.emptyMovements,
          emptySplit: t.emptySplit,
          simulateRevenue: t.simulateRevenue,
          settle: t.settle,
          accrued: t.accrued,
          settled: t.settled,
          gross: t.gross,
          net: t.net,
          protocolFee: t.protocolFee,
          error: t.ledgerError,
          execPending: t.execPending,
          execSubmitted: t.execSubmitted,
          execConfirmed: t.execConfirmed,
          execSimulated: t.execSimulated,
          execFailed: t.execFailed,
          execUnknown: t.execUnknown,
          execReference: t.execReference,
          execIntent: t.execIntent,
          execLayerOffChain: t.execLayerOffChain,
          execLayerOnChain: t.execLayerOnChain,
          selectRelease: t.selectRelease,
          selectReleaseHint: t.selectReleaseHint,
          noCatalog: t.noCatalog,
          originLabel: t.originLabel,
          splitTitle: t.splitTitle,
          revenueTitle: t.revenueTitle,
          entitlementsTitle: t.entitlementsTitle,
          balanceAccrued: t.balanceAccrued,
          balanceSettled: t.balanceSettled,
          noBalance: t.noBalance,
          assetLabel: t.assetLabel,
          withdrawSoon: t.withdrawSoon,
          beneficiaryLabel: t.beneficiaryLabel,
          roleOwner: t.roleOwner,
          roleParticipant: t.roleParticipant,
          roleBeneficiary: t.roleBeneficiary,
          ownerCaption: t.ownerCaption,
          participantCatalogHint: t.participantCatalogHint,
        }}
      />
    </div>
  );
}
