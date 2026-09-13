"use client";

/** Isolated demo UI. Not mounted on Artist Studio royalties. */
import { useCallback, useMemo, useState } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { buildDemoRoyaltyEngine } from "@/lib/royalty-engine/demoData";
import type { RoyaltyEngineSnapshot, RoyaltyParticipant } from "@/lib/royalty-engine/types";
import SettlementSummary from "./SettlementSummary";
import CollaboratorBalanceCard from "./CollaboratorBalanceCard";
import SplitFlowVisualization from "./SplitFlowVisualization";
import PaymentsTimeline from "./PaymentsTimeline";

export default function RoyaltyEngine() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.royalties;
  const base = useMemo(() => buildDemoRoyaltyEngine(), []);
  const [snapshot, setSnapshot] = useState<RoyaltyEngineSnapshot>(base);

  const roleLabels: Record<string, string> = {
    artist: t.roleArtist,
    producer: t.roleProducer,
    composer: t.roleComposer,
    performer: t.rolePerformer,
    author: t.roleAuthor,
    other: t.roleOther,
  };

  const handleWithdraw = useCallback(async (id: string) => {
    setSnapshot((prev) => {
      const participants: RoyaltyParticipant[] = prev.participants.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          availableBalance: 0,
          pendingBalance: p.pendingBalance,
        };
      });
      const totalAvailable = participants.reduce((a, p) => a + p.availableBalance, 0);
      return { ...prev, participants, totalAvailable };
    });
  }, []);

  return (
    <div className="space-y-8">
      <SettlementSummary
        totalPending={snapshot.totalPending}
        totalAvailable={snapshot.totalAvailable}
        totalDistributed={snapshot.totalDistributed}
        currency={snapshot.currency}
        networkLabel={snapshot.networkLabel}
        labels={{
          title: t.engineEyebrow,
          subtitle: t.engineTitle,
          pending: t.pendingBalance,
          available: t.availableBalance,
          distributed: t.totalDistributed,
          settlement: t.settlement,
          settlementHint: t.settlementHint,
        }}
      />

      <SplitFlowVisualization
        snapshot={snapshot}
        saleAmount={10}
        roleLabels={roleLabels}
        labels={{
          title: t.flowTitle,
          subtitle: t.flowSubtitle,
          saleLabel: t.flowSale,
          simulate: t.flowSimulate,
          replay: t.flowReplay,
          settledIn: t.flowSettledIn,
        }}
      />

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t.teamTitle}</h2>
            <p className="text-sm text-foreground/55">{t.teamSubtitle}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.participants.map((p) => (
            <CollaboratorBalanceCard
              key={p.id}
              participant={p}
              roleLabel={roleLabels[p.role] || p.role}
              labels={{
                pending: t.pendingBalance,
                available: t.availableBalance,
                withdraw: t.withdraw,
                withdrawing: t.withdrawing,
                withdrawn: t.withdrawn,
                ofSale: t.ofSale,
              }}
              onWithdraw={handleWithdraw}
            />
          ))}
        </div>
      </section>

      <PaymentsTimeline
        payments={snapshot.payments}
        participants={snapshot.participants}
        labels={{
          title: t.timelineTitle,
          empty: t.timelineEmpty,
          statusSettled: t.statusSettled,
          statusProcessing: t.statusProcessing,
          statusPending: t.statusPending,
          splitHint: t.splitHint,
        }}
      />
    </div>
  );
}
