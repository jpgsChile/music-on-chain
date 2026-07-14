"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

const CHAIN_IDS = ["base", "avalanche", "polygon", "bnb", "ethereum"] as const;
type ChainId = (typeof CHAIN_IDS)[number];

export default function ChainSwitcher() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;
  const [selected, setSelected] = useState<ChainId>("base");

  return (
    <section className="border-b border-zinc-800/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3">
          {p.chains.eyebrow}
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-50">
          {p.chains.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl">
          {p.chains.hint}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          {CHAIN_IDS.map((id) => {
            const isActive = id === selected;
            const isBase = id === "base";
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`px-4 py-3 rounded-xl border text-left transition-colors min-w-[140px] ${
                  isActive
                    ? "border-blue-500/50 bg-blue-500/[0.07]"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
              >
                <span
                  className={`block text-sm font-medium ${
                    isActive ? "text-zinc-50" : "text-zinc-300"
                  }`}
                >
                  {p.chains.names[id]}
                </span>
                <span
                  className={`mt-1 inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                    isBase
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  {isBase ? p.chains.activeBadge : p.chains.roadmapBadge}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5"
          >
            {selected === "base" ? (
              <p className="text-sm text-zinc-400 leading-relaxed">
                {p.chains.baseActiveMessage}
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-blue-300">
                  {p.chains.sameProtocolTitle}
                </p>
                <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                  {p.chains.sameProtocolBody}
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
