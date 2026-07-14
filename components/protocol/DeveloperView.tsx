"use client";

import { AnimatePresence, motion } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import type { DeveloperTrace } from "@/lib/demo/mockSdk";

interface DeveloperViewProps {
  trace: DeveloperTrace | null;
}

export default function DeveloperView({ trace }: DeveloperViewProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;

  const rows: { key: keyof DeveloperTrace; label: string }[] = [
    { key: "sdkCall", label: p.developerView.sdkCallLabel },
    { key: "coreMethod", label: p.developerView.coreMethodLabel },
    { key: "domainEvent", label: p.developerView.domainEventLabel },
    { key: "adapterCall", label: p.developerView.adapterCallLabel },
    { key: "settlement", label: p.developerView.settlementLabel },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-5">
        {p.developerView.stackLabel}
      </p>

      {!trace ? (
        <p className="text-sm text-zinc-600">{p.developerView.empty}</p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={trace.sdkCall}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-0"
          >
            {rows.map((row, index) => (
              <div key={row.key} className="relative pl-1">
                <div className="flex items-baseline gap-3 py-2.5">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500 w-24 shrink-0">
                    {row.label}
                  </span>
                  <code className="text-xs font-mono text-zinc-200 break-all">
                    {trace[row.key]}
                  </code>
                </div>
                {index < rows.length - 1 && (
                  <div className="pl-[100px] text-blue-500/40 text-xs -mt-1 mb-0.5">↓</div>
                )}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
