"use client";

import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import ChannelEditor from "@/components/studio/ChannelEditor";
import { StudioPageHeader } from "@/components/studio/StudioStates";

export default function StudioChannelPage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.channel;
  const { actorRef, walletAddress } = useStudioIdentity();

  return (
    <div>
      <StudioPageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <ChannelEditor actorRef={actorRef} wallet={walletAddress ?? ""} />
    </div>
  );
}
