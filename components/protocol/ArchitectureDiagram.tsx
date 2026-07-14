"use client";

import { motion } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import type { LayerId } from "@/lib/demo/mockSdk";

const LAYER_IDS = ["ui", "sdk", "core", "adapter", "base"] as const;

interface ArchitectureDiagramProps {
  activeLayer: LayerId | null;
}

export default function ArchitectureDiagram({ activeLayer }: ArchitectureDiagramProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;

  const layers = LAYER_IDS.map((id) => ({
    id,
    title: p.architecture.layers[id].title,
    body: p.architecture.layers[id].body,
  }));

  return (
    <section className="border-b border-zinc-800/60 bg-zinc-950/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3">
          {p.architecture.eyebrow}
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-50">
          {p.architecture.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl">
          {p.architecture.hint}
        </p>

        <div className="mt-12 relative">
          <div className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-px bg-zinc-800" />
          <div className="space-y-3">
            {layers.map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <motion.div
                  key={layer.id}
                  animate={{
                    scale: isActive ? 1.01 : 1,
                    borderColor: isActive
                      ? "rgba(59,130,246,0.55)"
                      : "rgba(63,63,70,0.6)",
                    backgroundColor: isActive
                      ? "rgba(59,130,246,0.06)"
                      : "rgba(24,24,27,0.4)",
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative pl-11 sm:pl-14 pr-5 py-4 rounded-xl border"
                >
                  <div
                    className={`absolute left-[13px] sm:left-[17px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border transition-colors duration-300 ${
                      isActive
                        ? "bg-blue-400 border-blue-300"
                        : "bg-zinc-900 border-zinc-700"
                    }`}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isActive ? "text-zinc-50" : "text-zinc-200"
                      }`}
                    >
                      {layer.title}
                    </h3>
                    {layer.id === "base" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300 font-mono">
                        {p.architecture.baseBadge}
                      </span>
                    )}
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-blue-400/40 bg-blue-400/10 text-blue-300 font-mono uppercase tracking-wide"
                      >
                        {p.architecture.activeBadge}
                      </motion.span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed max-w-2xl">
                    {layer.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="mt-8 text-xs text-zinc-500 font-mono">
          {p.architecture.noDirectChainAccess}
        </p>
      </div>
    </section>
  );
}
