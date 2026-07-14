"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import {
  DOMAIN_CATALOG,
  DOMAIN_OBJECT_IDS,
  type DomainObjectId,
} from "@/lib/demo/domainCatalog";

export default function DomainExplorer() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;
  const [selected, setSelected] = useState<DomainObjectId>(DOMAIN_OBJECT_IDS[0]);

  const def = DOMAIN_CATALOG[selected];
  const copy = p.domain[selected];

  return (
    <section className="border-b border-zinc-800/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3">
          {p.domainExplorer.eyebrow}
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-50">
          {p.domainExplorer.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl">
          {p.domainExplorer.hint}
        </p>

        <div className="mt-10 grid lg:grid-cols-[240px_1fr] gap-6">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1">
            {DOMAIN_OBJECT_IDS.map((id) => {
              const isActive = id === selected;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`shrink-0 text-left px-4 py-3 rounded-lg border text-sm transition-colors whitespace-nowrap lg:whitespace-normal ${
                    isActive
                      ? "border-blue-500/50 bg-blue-500/[0.07] text-zinc-50"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {p.domain[id].name}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 min-h-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-medium text-zinc-50">{copy.name}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-2xl">
                  {copy.purpose}
                </p>

                <div className="mt-6 grid sm:grid-cols-2 gap-5">
                  <Panel label={p.domainExplorer.propertiesLabel}>
                    {def.properties.map((key) => (
                      <Chip key={key} mono>
                        {copy.properties[key as keyof typeof copy.properties]}
                      </Chip>
                    ))}
                  </Panel>

                  <Panel label={p.domainExplorer.methodsLabel}>
                    {def.methods.map((key) => (
                      <Chip key={key} mono accent>
                        {copy.methods[key as keyof typeof copy.methods]}()
                      </Chip>
                    ))}
                  </Panel>

                  <Panel label={p.domainExplorer.eventsLabel}>
                    {def.events.map((key) => (
                      <Chip key={key}>
                        {copy.events[key as keyof typeof copy.events]}
                      </Chip>
                    ))}
                  </Panel>

                  <Panel label={p.domainExplorer.relationsLabel}>
                    {def.relations.map((relatedId) => (
                      <button
                        key={relatedId}
                        type="button"
                        onClick={() => setSelected(relatedId)}
                        className="text-xs px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-300 hover:border-blue-500/50 hover:text-blue-300 transition-colors"
                      >
                        {p.domain[relatedId].name}
                      </button>
                    ))}
                  </Panel>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  children,
  mono,
  accent,
}: {
  children: React.ReactNode;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-md border ${
        accent
          ? "border-blue-500/30 bg-blue-500/[0.06] text-blue-300"
          : "border-zinc-700 bg-zinc-900/60 text-zinc-300"
      } ${mono ? "font-mono" : ""}`}
    >
      {children}
    </span>
  );
}
