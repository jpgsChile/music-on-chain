"use client";

import { useState } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";

interface ConnectArtistProps {
  /** Inline: single button. Modal: open a modal with two options then trigger login. */
  variant?: "inline" | "modal";
  /** Optional class for the trigger button (inline) or the primary CTA (modal). */
  className?: string;
  /** For modal: show as a card grid (e.g. on dashboard). */
  asCardGrid?: boolean;
}

function WalletIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 15h.01" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

export default function ConnectArtist({
  variant = "inline",
  className = "",
  asCardGrid = false,
}: ConnectArtistProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { ready, login } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const handleConnect = () => {
    if (!ready) return;
    setModalOpen(false);
    login();
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={login}
        disabled={!ready}
        className={
          className ||
          "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        }
      >
        <WalletIcon />
        {ready ? t.auth.connectCtaShort : t.auth.loading}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-background hover:bg-accent-hover transition-colors"
        }
      >
        <WalletIcon />
        {t.auth.connectCtaShort}
      </button>
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="connect-title"
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 pb-4">
              <h2 id="connect-title" className="text-xl font-bold text-foreground">
                {t.auth.connectTitle}
              </h2>
              <p className="text-sm text-foreground/70 mt-1">
                {t.auth.connectOptions}
              </p>
            </div>
            <div
              className={
                asCardGrid
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 pb-6"
                  : "flex flex-col gap-3 px-6 pb-6"
              }
            >
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
              >
                <span className="p-2 rounded-lg bg-accent/20 text-accent group-hover:bg-accent/30">
                  <WalletIcon />
                </span>
                <div>
                  <span className="font-semibold text-foreground block">
                    {t.auth.connectWithWallet}
                  </span>
                  <span className="text-sm text-foreground/70">
                    {t.auth.connectWithWalletDesc}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
              >
                <span className="p-2 rounded-lg bg-foreground/10 text-foreground group-hover:bg-foreground/20">
                  <MailIcon />
                </span>
                <div>
                  <span className="font-semibold text-foreground block">
                    {t.auth.connectWithPrivy}
                  </span>
                  <span className="text-sm text-foreground/70">
                    {t.auth.connectWithPrivyDesc}
                  </span>
                </div>
              </button>
            </div>
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={handleConnect}
                disabled={!ready}
                className="w-full py-3 rounded-xl font-medium bg-accent text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ready ? t.auth.connectCta : t.auth.loading}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
