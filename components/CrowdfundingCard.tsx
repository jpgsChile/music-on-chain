"use client";

import { useState } from "react";
import type { Artist } from "@/data/artists";
import type { CrowdfundingCampaign } from "@/data/artists";
import { getArtistWallet } from "@/data/artists";
import ContributeModal from "@/components/ContributeModal";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

interface CrowdfundingCardProps {
  artist: Artist;
  campaign: CrowdfundingCampaign;
  artistWalletOverride?: string;
}

function formatDeadline(deadline: string): string {
  try {
    const d = new Date(deadline);
    return d.toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return deadline;
  }
}

export default function CrowdfundingCard({
  artist,
  campaign,
  artistWalletOverride,
}: CrowdfundingCardProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const [modalOpen, setModalOpen] = useState(false);
  const artistWallet = artistWalletOverride?.trim() || getArtistWallet(artist);
  const progress = Math.min(
    100,
    campaign.targetAmount > 0
      ? (campaign.raisedAmount / campaign.targetAmount) * 100
      : 0
  );

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden bg-border/10">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground">{campaign.title}</h3>
          <p className="text-sm text-foreground/70 mt-1">{campaign.description}</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-foreground/70">
                {campaign.raisedAmount.toLocaleString()} / {campaign.targetAmount.toLocaleString()} {campaign.currency}
              </span>
              <span className="text-foreground/70">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-foreground/50 mt-2">
            {t.crowdfunding.deadline}: {formatDeadline(campaign.deadline)}
          </p>
          {campaign.benefits.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-foreground/80">
              {campaign.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-accent">•</span> {b}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 w-full sm:w-auto px-6 py-2.5 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t.crowdfunding.contribute}
          </button>
        </div>
      </div>
      <ContributeModal
        artist={artist}
        campaign={campaign}
        artistWallet={artistWallet}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
