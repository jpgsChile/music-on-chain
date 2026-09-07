"use client";

import { useState } from "react";
import Link from "next/link";
import { useStudioIdentity } from "@/lib/identity/StudioIdentity";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import ReleaseWizard from "@/components/release-wizard/ReleaseWizard";

export default function UploadSongPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { actorRef, walletAddress } = useStudioIdentity();
  const [published, setPublished] = useState(false);
  const uw = t.uploadWizard;

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mb-6 max-w-5xl mx-auto">
        <Link href="/dashboard/release" className="text-sm text-foreground/70 hover:text-foreground">
          ← {t.studio?.nav?.release || t.dashboard.title}
        </Link>
      </div>
      {published ? (
        <div className="max-w-lg mx-auto border border-border rounded-xl p-6 bg-background text-center">
          <p className="font-semibold text-foreground">{uw.publishSuccess || uw.mintSuccess}</p>
          <p className="text-sm text-foreground/60 mt-2">{uw.publishSuccessDesc}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover"
            >
              {uw.goDashboard}
            </Link>
            <Link
              href="/dashboard/music"
              className="px-4 py-2 rounded-lg border border-border hover:bg-border/30"
            >
              {uw.goWorks}
            </Link>
          </div>
        </div>
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
