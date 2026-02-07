"use client";

import { useState, useCallback } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

const BASE_SEPOLIA_CHAIN_ID = "84532";

function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function addressToColor(address: string): string {
  if (!address) return "#22d3ee";
  const hex = address.replace(/^0x/, "").replace(/[^0-9a-fA-F]/g, "0").slice(-6);
  return `#${hex.padStart(6, "0").slice(0, 6)}`;
}

function addressToShortId(address: string): string {
  if (!address || address.length < 4) return "----";
  return address.slice(-4);
}

interface FanWalletCardProps {
  address: string;
}

export default function FanWalletCard({ address }: FanWalletCardProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const [copied, setCopied] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [step2Copied, setStep2Copied] = useState(false);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setStep2Copied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const openBuyFlow = useCallback(() => {
    setStep2Copied(false);
    setBuyModalOpen(true);
    copyAddress();
  }, [copyAddress]);

  if (!address) return null;

  const shortId = addressToShortId(address);
  const bgColor = addressToColor(address);

  return (
    <>
      <section className="mb-10 rounded-xl border border-border bg-background p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Avatar + nombre amigable */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border-2 border-border"
              style={{ backgroundColor: `${bgColor}20` }}
              aria-hidden
            >
              🎧
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {t.fanWallet.title}
              </h2>
              <p className="text-sm text-foreground/70 mt-0.5">
                {t.fanWallet.subtitle}
              </p>
              <p className="text-xs text-foreground/50 mt-1">
                {t.fanWallet.subtitleHint}
              </p>
              <p className="text-sm font-medium text-foreground/80 mt-2">
                {t.fanWallet.fanWalletLabel} • #{shortId}
              </p>
            </div>
          </div>

          {/* Dirección truncada + copiar */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/60 mb-1">
              {t.fanWallet.addressLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-sm font-mono text-foreground/90 bg-border/30 px-3 py-2 rounded-lg">
                {truncateAddress(address)}
              </code>
              <button
                type="button"
                onClick={copyAddress}
                className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-border/30 transition-colors"
              >
                {copied ? t.fanWallet.copied : t.fanWallet.copy}
              </button>
            </div>
            <p className="text-xs text-foreground/50 mt-2">
              {t.fanWallet.addressHint}
            </p>
          </div>
        </div>

        {/* CTA Comprar USDC */}
        <div className="mt-6 pt-6 border-t border-border">
          <button
            type="button"
            onClick={openBuyFlow}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium rounded-lg bg-accent text-background hover:bg-accent-hover transition-colors"
          >
            <span aria-hidden>💳</span>
            {t.fanWallet.buyUsdcCta}
          </button>
        </div>

        {/* Advertencia */}
        <div className="mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <span aria-hidden>⚠️</span>
            {t.fanWallet.warningTitle}
          </p>
          <p className="text-sm text-foreground/80 mt-1">
            {t.fanWallet.warningText}
          </p>
        </div>

        {/* Accordion detalles técnicos */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="text-sm text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span className="text-foreground/50">{advancedOpen ? "▾" : "▸"}</span>
            {t.fanWallet.advancedToggle}
          </button>
          {advancedOpen && (
            <div className="mt-3 p-4 rounded-lg bg-border/10 text-sm font-mono text-foreground/70 space-y-2">
              <p>
                <span className="text-foreground/50">{t.fanWallet.advancedAddress}:</span>{" "}
                {address}
              </p>
              <p>
                <span className="text-foreground/50">{t.fanWallet.advancedChainId}:</span>{" "}
                {BASE_SEPOLIA_CHAIN_ID}
              </p>
              <p>
                <span className="text-foreground/50">{t.fanWallet.advancedWalletType}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Modal flujo Comprar USDC */}
      {buyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setBuyModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="buy-usdc-title"
        >
          <div
            className="bg-background border border-border rounded-xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="buy-usdc-title" className="text-lg font-semibold text-foreground mb-4">
              💳 {t.fanWallet.buyUsdcCta}
            </h3>

            {/* Paso 1 */}
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground">
                {t.fanWallet.buyUsdcStep1Title}
              </p>
              <p className="text-sm text-foreground/80 mt-1 flex items-center gap-2">
                <span className="text-accent">✔️</span>
                {t.fanWallet.buyUsdcStep1Done}
              </p>
              <p className="text-xs text-foreground/50 mt-0.5">
                🔒 {t.fanWallet.buyUsdcStep1Locked}
              </p>
            </div>

            {/* Paso 2 */}
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground">
                {t.fanWallet.buyUsdcStep2Title}
              </p>
              {step2Copied ? (
                <p className="text-sm text-accent mt-1 flex items-center gap-2">
                  ✅ {t.fanWallet.buyUsdcStep2Copied}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={copyAddress}
                  className="mt-1 text-sm text-foreground/80 underline hover:text-foreground"
                >
                  {t.fanWallet.copy}
                </button>
              )}
              <p className="text-xs text-foreground/60 mt-1">
                {t.fanWallet.buyUsdcStep2Hint}
              </p>
            </div>

            {/* Paso 3 */}
            <div className="mb-6">
              <p className="text-sm font-medium text-foreground">
                {t.fanWallet.buyUsdcStep3Title}
              </p>
              <p className="text-xs text-foreground/60 mt-1 mb-3">
                {t.fanWallet.buyUsdcStep3Hint}
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-lg">🟦</span>
                  <a
                    href="https://www.coinbase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {t.fanWallet.optionCoinbase}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">🟨</span>
                  <a
                    href="https://www.binance.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {t.fanWallet.optionBinance}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">🟩</span>
                  <span className="text-foreground/80">
                    {t.fanWallet.optionTransfer}
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-foreground/80 mb-4">
              ⚠️ {t.fanWallet.warningText}
            </div>

            <button
              type="button"
              onClick={() => setBuyModalOpen(false)}
              className="w-full py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-border/30 transition-colors"
            >
              {t.fanWallet.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
