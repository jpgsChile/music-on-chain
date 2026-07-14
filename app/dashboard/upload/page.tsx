"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import SongUploadWizard from "@/components/upload-wizard/SongUploadWizard";
import ConnectArtist from "@/components/ConnectArtist";

export default function UploadSongPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { authenticated, user } = useAuth();
  const wallet = user?.wallet?.address ?? "";
  const [published, setPublished] = useState(false);
  const uw = t.uploadWizard;

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{uw.title}</h1>
          <p className="text-foreground/70 mb-4">{uw.needAccount}</p>
          <div className="flex justify-center">
            <ConnectArtist
              variant="modal"
              className="px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{uw.title}</h1>
          <p className="text-foreground/70 mb-4">{uw.needAccountContinue}</p>
          <div className="flex justify-center">
            <ConnectArtist
              variant="modal"
              className="px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-foreground/70 hover:text-foreground">
          ← {t.dashboard.title}
        </Link>
      </div>
      {published ? (
        <div className="max-w-lg mx-auto border border-border rounded-xl p-6 bg-background">
          <p className="font-semibold text-foreground">{uw.mintSuccess}</p>
          <p className="text-sm text-foreground/60 mt-2">{uw.nextSteps}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover"
            >
              {uw.goDashboard}
            </Link>
            <Link
              href="/dashboard/canciones"
              className="px-4 py-2 rounded-lg border border-border hover:bg-border/30"
            >
              {uw.goWorks}
            </Link>
            <Link
              href="/#marketplace"
              className="px-4 py-2 rounded-lg border border-border hover:bg-border/30"
            >
              {t.tracks.goMarketplace}
            </Link>
          </div>
        </div>
      ) : (
        <SongUploadWizard artistWallet={wallet} onComplete={() => setPublished(true)} />
      )}
    </div>
  );
}
