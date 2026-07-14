"use client";

import { AnimatePresence, motion } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import type { ConsoleLine, DemoMethodId } from "@/lib/demo/mockSdk";

const METHOD_IDS: DemoMethodId[] = [
  "connectWallet",
  "publishAsset",
  "sellAsset",
  "buyAsset",
  "issueLicense",
  "transferOwnership",
  "claimRoyalty",
];

interface SdkConsoleProps {
  busy: boolean;
  onRun: (method: DemoMethodId) => void;
  lines: ConsoleLine[];
  generatedCode: string;
  onCopy: () => void;
}

const LAYER_COLOR: Record<string, string> = {
  ui: "text-zinc-400",
  sdk: "text-blue-300",
  core: "text-emerald-300",
  adapter: "text-amber-300",
  base: "text-blue-400",
};

function formatLine(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template
  );
}

export default function SdkConsole({
  busy,
  onRun,
  lines,
  generatedCode,
  onCopy,
}: SdkConsoleProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-4">
        {p.console.label}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {METHOD_IDS.map((method) => (
          <button
            key={method}
            type="button"
            disabled={busy}
            onClick={() => onRun(method)}
            className="px-3 py-2 text-xs font-mono rounded-lg border border-zinc-800 text-zinc-300 hover:border-blue-500/40 hover:text-blue-200 hover:bg-blue-500/[0.05] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {method}()
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800/80 bg-black/40 p-4 h-64 overflow-y-auto font-mono text-xs">
        {lines.length === 0 ? (
          <p className="text-zinc-600">{p.console.empty}</p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <motion.li
                  key={line.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 items-start"
                >
                  <span className="text-zinc-600 shrink-0">
                    {line.kind === "success" ? "✓" : line.kind === "chain" ? "◦" : "›"}
                  </span>
                  <span className={`shrink-0 uppercase text-[10px] pt-0.5 ${LAYER_COLOR[line.layer]}`}>
                    {line.layer}
                  </span>
                  <span
                    className={
                      line.kind === "success" ? "text-emerald-300" : "text-zinc-300"
                    }
                  >
                    {formatLine(
                      p.console[line.messageKey as keyof typeof p.console] ?? line.messageKey,
                      line.params
                    )}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            {p.console.generatedCodeLabel}
          </p>
          <button
            type="button"
            onClick={onCopy}
            className="text-[11px] text-zinc-400 hover:text-blue-300 transition-colors"
          >
            {p.console.copy}
          </button>
        </div>
        <pre className="rounded-lg border border-zinc-800/80 bg-black/40 p-4 text-[11px] font-mono text-zinc-400 overflow-x-auto leading-relaxed max-h-56 overflow-y-auto">
          {generatedCode}
        </pre>
      </div>
    </div>
  );
}
