"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { demoSdk, resetDemo } from "@/lib/demo/mockSdk";
import {
  PRESENTATION_DURATIONS_MS,
  PRESENTATION_SLIDE_IDS,
  type PresentationSlideId,
} from "@/lib/demo/presentationSlides";

interface InvestorPresentationProps {
  open: boolean;
  onClose: () => void;
}

const slideMotion = {
  initial: { opacity: 0, y: 28, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: "blur(4px)",
    transition: { duration: 0.45, ease: [0.4, 0, 1, 1] as const },
  },
};

export default function InvestorPresentation({
  open,
  onClose,
}: InvestorPresentationProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol.presentation;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedDemoRef = useRef(false);

  const slideId = PRESENTATION_SLIDE_IDS[index];
  const slide = p.slides[slideId];
  const total = PRESENTATION_SLIDE_IDS.length;

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1));
    setProgress(0);
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
    setProgress(0);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((v) => !v);
  }, []);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setProgress(0);
    setPlaying(false);
    startedDemoRef.current = false;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keyboard
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setPlaying(false);
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setPlaying(false);
        goPrev();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goNext, goPrev, togglePlay, onClose]);

  // Autoplay dwell
  useEffect(() => {
    if (!open || !playing) return;

    const duration = PRESENTATION_DURATIONS_MS[slideId];
    const started = performance.now();
    let raf = 0;
    let advanced = false;

    const tick = (now: number) => {
      const elapsed = now - started;
      setProgress(Math.min(1, elapsed / duration));
      if (elapsed >= duration && !advanced) {
        advanced = true;
        if (index >= total - 1) {
          setPlaying(false);
          setProgress(1);
        } else {
          setIndex((i) => i + 1);
          setProgress(0);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, playing, index, slideId, total]);

  // Live SDK pulse on Architecture / SDK / Settlement slides
  useEffect(() => {
    if (!open || !playing) return;
    if (slideId !== "sdk" && slideId !== "architecture" && slideId !== "settlement") {
      return;
    }
    if (startedDemoRef.current) return;
    startedDemoRef.current = true;

    void (async () => {
      resetDemo();
      await demoSdk.connectWallet();
      await demoSdk.publishAsset({ title: t.protocol.publishAssetDemoTitle });
      await demoSdk.sellAsset({
        assetId: "asset_mirrors",
        price: { amount: "1.00", currency: "USD" },
      });
      await demoSdk.buyAsset({ assetId: "asset_mirrors" });
    })();
  }, [open, playing, slideId, t.protocol.publishAssetDemoTitle]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#050505] text-zinc-100 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={p.title}
    >
      {/* Ambient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(255,255,255,0.03), transparent 40%)",
        }}
      />

      {/* Top chrome */}
      <div className="relative z-10 flex items-center justify-between px-5 sm:px-10 pt-5 sm:pt-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 truncate">
            {p.brand}
          </span>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <span className="hidden sm:inline text-[11px] text-zinc-600 truncate">
            {p.durationLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {p.exit}
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-16 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideId}
            className="w-full max-w-4xl"
            initial={slideMotion.initial}
            animate={slideMotion.animate}
            exit={slideMotion.exit}
          >
            <p className="text-xs sm:text-sm uppercase tracking-[0.28em] text-blue-400/70 mb-6 sm:mb-8">
              {slide.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-zinc-50 leading-[1.08] max-w-3xl">
              {slide.title}
            </h2>
            <p className="mt-6 sm:mt-8 text-lg sm:text-2xl text-zinc-400 leading-relaxed max-w-2xl font-light">
              {slide.body}
            </p>

            {slide.points.length > 0 && (
              <ul className="mt-10 space-y-4 max-w-xl">
                {slide.points.map((point) => (
                  <motion.li
                    key={point}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="flex gap-3 text-base sm:text-lg text-zinc-300"
                  >
                    <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-blue-400/80 shrink-0" />
                    <span>{point}</span>
                  </motion.li>
                ))}
              </ul>
            )}

            <SlideVisual slideId={slideId} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Narration caption */}
      <div className="relative z-10 px-6 sm:px-16 pb-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={`cap-${slideId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-sm sm:text-base text-zinc-500 max-w-2xl mx-auto italic font-light"
          >
            {slide.caption}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress + controls */}
      <div className="relative z-10 px-5 sm:px-10 pb-6 sm:pb-8 space-y-4">
        <div className="h-[2px] w-full bg-zinc-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-zinc-100/80 origin-left"
            style={{
              width: `${((index + (playing ? progress : 0)) / total) * 100}%`,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {PRESENTATION_SLIDE_IDS.map((id, i) => (
              <button
                key={id}
                type="button"
                aria-label={`${p.slideLabel} ${i + 1}`}
                onClick={() => {
                  setPlaying(false);
                  setIndex(i);
                  setProgress(0);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-zinc-100"
                    : i < index
                      ? "w-1.5 bg-zinc-500"
                      : "w-1.5 bg-zinc-800 hover:bg-zinc-600"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                goPrev();
              }}
              disabled={index === 0}
              className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded-full hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-30 transition-colors"
            >
              ← {p.prev}
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="px-4 py-1.5 text-xs font-medium text-zinc-950 bg-zinc-100 rounded-full hover:bg-white transition-colors"
            >
              {playing ? p.pause : p.play}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                goNext();
              }}
              disabled={index === total - 1}
              className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded-full hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-30 transition-colors"
            >
              {p.next} →
            </button>
          </div>
        </div>

        <p className="text-[10px] sm:text-[11px] text-zinc-600 text-center tracking-wide">
          {p.shortcuts}
        </p>
      </div>
    </div>
  );
}

function SlideVisual({ slideId }: { slideId: PresentationSlideId }) {
  if (slideId === "architecture") {
    const layers = ["UI", "SDK", "Core", "Adapter", "Base"];
    return (
      <div className="mt-12 flex flex-col items-start gap-2 max-w-xs">
        {layers.map((layer, i) => (
          <motion.div
            key={layer}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.12, duration: 0.45 }}
            className="w-full flex items-center gap-3"
          >
            <div
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                layer === "Base"
                  ? "border-blue-500/40 bg-blue-500/[0.07] text-blue-200"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-300"
              }`}
            >
              {layer}
            </div>
            {i < layers.length - 1 && (
              <span className="text-zinc-700 text-xs absolute -ml-0" />
            )}
          </motion.div>
        ))}
      </div>
    );
  }

  if (slideId === "sdk") {
    return (
      <motion.pre
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="mt-12 rounded-xl border border-zinc-800 bg-black/50 p-5 text-xs sm:text-sm font-mono text-zinc-400 overflow-x-auto leading-relaxed max-w-lg"
      >
{`const sdk = new MusicOnChainSDK()
await sdk.connectWallet()
await sdk.publishAsset({ title: "Mirrors" })
await sdk.issueLicense({ type: "download" })`}
      </motion.pre>
    );
  }

  if (slideId === "multichain") {
    const chains = [
      { name: "Base", active: true },
      { name: "Avalanche", active: false },
      { name: "Polygon", active: false },
      { name: "Ethereum", active: false },
      { name: "BNB", active: false },
    ];
    return (
      <div className="mt-12 flex flex-wrap gap-2">
        {chains.map((c, i) => (
          <motion.span
            key={c.name}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              c.active
                ? "border-blue-500/50 text-blue-200 bg-blue-500/10"
                : "border-zinc-800 text-zinc-500"
            }`}
          >
            {c.name}
          </motion.span>
        ))}
      </div>
    );
  }

  return null;
}
