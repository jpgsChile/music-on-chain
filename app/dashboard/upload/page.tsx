"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import SongUploadWizard from "@/components/upload-wizard/SongUploadWizard";

export default function UploadSongPage() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { authenticated, login, ready, user } = useAuth();
  const wallet = user?.wallet?.address ?? "";

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">{(t.uploadWizard as Record<string, string>)?.title ?? "Subir canción"}</h1>
          <p className="text-foreground/70 mb-4">Inicia sesión con tu wallet para subir una canción.</p>
          <button onClick={login} disabled={!ready} className="px-4 py-2 bg-accent text-background rounded-lg hover:bg-accent-hover disabled:opacity-50">
            {ready ? t.auth.signIn : t.auth.loading}
          </button>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-foreground/70">Conecta una wallet para continuar.</p>
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
      <SongUploadWizard artistWallet={wallet} onComplete={() => {}} />
    </div>
  );
}
