"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import type { DemoMetrics } from "@/lib/demo/mockSdk";

interface ProtocolMetricsProps {
  metrics: DemoMetrics;
}

function Counter({
  value,
  suffix,
}: {
  value: number;
  suffix?: string;
}) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString());
  const [display, setDisplay] = useState(() => Math.round(value).toLocaleString());

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.7, ease: "easeOut" });
    return () => controls.stop();
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => setDisplay(latest));
    return unsubscribe;
  }, [rounded]);

  return (
    <span>
      {display}
      {suffix ?? ""}
    </span>
  );
}

export default function ProtocolMetrics({ metrics }: ProtocolMetricsProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;

  const items: { key: keyof DemoMetrics; label: string; suffix?: string }[] = [
    { key: "apiCalls", label: p.metrics.apiCalls },
    { key: "assetsPublished", label: p.metrics.assetsPublished },
    { key: "licensesIssued", label: p.metrics.licensesIssued },
    { key: "royaltiesDistributed", label: p.metrics.royaltiesDistributed },
    { key: "settlementTimeMs", label: p.metrics.settlementTimeMs, suffix: " ms" },
    { key: "connectedWallets", label: p.metrics.connectedWallets },
  ];

  return (
    <section className="border-b border-zinc-800/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3">
          {p.metrics.eyebrow}
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-50">{p.metrics.title}</h2>
        <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-xl">{p.metrics.hint}</p>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5"
            >
              <p className="text-2xl sm:text-3xl font-semibold text-zinc-50 font-mono">
                <Counter value={metrics[item.key]} suffix={item.suffix} />
              </p>
              <p className="mt-1.5 text-xs text-zinc-500">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
