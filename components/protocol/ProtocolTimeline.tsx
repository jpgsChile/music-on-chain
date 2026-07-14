"use client";

import { motion } from "framer-motion";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { TIMELINE_STEP_IDS, type TimelineStepId } from "@/lib/demo/mockSdk";

interface ProtocolTimelineProps {
  activeStep: TimelineStepId | null;
  completedSteps: TimelineStepId[];
}

export default function ProtocolTimeline({
  activeStep,
  completedSteps,
}: ProtocolTimelineProps) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const p = t.protocol;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-5">
        {p.timeline.label}
      </p>
      <ol className="space-y-0">
        {TIMELINE_STEP_IDS.map((stepId, index) => {
          const isActive = activeStep === stepId;
          const isDone = completedSteps.includes(stepId);
          const isLast = index === TIMELINE_STEP_IDS.length - 1;

          return (
            <li key={stepId} className="relative pl-8 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[7px] top-4 bottom-0 w-px transition-colors duration-300 ${
                    isDone ? "bg-blue-500/40" : "bg-zinc-800"
                  }`}
                />
              )}
              <motion.span
                initial={false}
                animate={{
                  scale: isActive ? 1.15 : 1,
                  backgroundColor: isDone
                    ? "rgb(59,130,246)"
                    : isActive
                      ? "rgb(96,165,250)"
                      : "rgb(39,39,42)",
                  borderColor: isDone || isActive ? "rgba(59,130,246,0.6)" : "rgba(63,63,70,0.8)",
                }}
                transition={{ duration: 0.3 }}
                className="absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full border"
              />
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isDone
                      ? "text-zinc-300"
                      : isActive
                        ? "text-zinc-50 font-medium"
                        : "text-zinc-500"
                  }`}
                >
                  {p.timeline.steps[stepId]}
                </p>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  />
                )}
                {isDone && !isActive && (
                  <span className="text-blue-400 text-xs">✓</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
