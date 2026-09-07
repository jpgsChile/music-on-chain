"use client";

import { useState } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import ReleaseWizard from "@/components/release-wizard/ReleaseWizard";
import {
  StudioEmptyState,
  StudioPageHeader,
  StudioSuccess,
} from "@/components/studio/StudioStates";

export default function StudioReleasePage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.release;
  const uw = getTranslations(locale).uploadWizard;
  const { actorRef, walletAddress } = useStudioIdentity();
  const [published, setPublished] = useState(false);
  const [started, setStarted] = useState(false);

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

      {published ? (
        <StudioSuccess
          title={t.successTitle}
          description={t.successDesc}
          ctaLabel={t.successCta}
          ctaHref="/dashboard/music"
        />
      ) : !started ? (
        <StudioEmptyState
          title={t.emptyTitle}
          description={t.emptyDesc}
          ctaLabel={t.startCta || uw.mint}
          onCta={() => setStarted(true)}
        />
      ) : (
        <ReleaseWizard
          actorRef={actorRef}
          artistWallet={walletAddress ?? ""}
          onComplete={() => setPublished(true)}
        />
      )}
    </div>
  );
}
