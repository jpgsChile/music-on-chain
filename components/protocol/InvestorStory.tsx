"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";

const STEP_IDS = ["application", "sdk", "protocol", "infrastructure", "multichain"] as const;

export default function InvestorStory() {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 40%"],
  });
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const steps = STEP_IDS.map((id, index) => ({
    id,
    index,
    title: p.story.steps[id].title,
    body: p.story.steps[id].body,
  }));

  return (
    <section ref={containerRef} className="border-b border-zinc-800/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3"
        >
          {p.story.eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-3xl sm:text-4xl font-semibold text-zinc-50 max-w-2xl leading-tight"
        >
          {p.story.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-4 text-base sm:text-lg text-zinc-400 max-w-2xl"
        >
          {p.story.subtitle}
        </motion.p>

        <div className="mt-14 relative">
          <div className="hidden sm:block absolute top-5 left-0 right-0 h-px bg-zinc-800">
            <motion.div
              style={{ width: progressWidth }}
              className="h-px bg-gradient-to-r from-blue-500/70 via-blue-400/70 to-blue-500/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-8 sm:gap-4">
            {steps.map((step) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, delay: step.index * 0.08 }}
                className="relative"
              >
                <div className="hidden sm:flex w-2.5 h-2.5 rounded-full bg-zinc-950 border border-blue-400/60 mb-4 items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                </div>
                <div className="flex items-baseline gap-2 sm:block">
                  <span className="text-xs font-mono text-zinc-500">
                    0{step.index + 1}
                  </span>
                  <h3 className="text-sm font-medium text-zinc-100 sm:mt-1">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
