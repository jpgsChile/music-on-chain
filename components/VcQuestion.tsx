"use client";

type Props = {
  question: string;
  answer: string;
  thesis?: string;
  as?: "h1" | "h2";
  /** dark = protocol zinc surfaces */
  tone?: "default" | "dark";
  className?: string;
};

/** Lightweight investor framing — no new visual system. */
export default function VcQuestion({
  question,
  answer,
  thesis,
  as = "h2",
  tone = "default",
  className = "",
}: Props) {
  const Heading = as;
  const qClass =
    tone === "dark"
      ? "text-xs uppercase tracking-[0.2em] text-blue-400/80 mb-3"
      : "text-xs uppercase tracking-[0.2em] text-accent mb-3";
  const aClass =
    tone === "dark"
      ? "text-3xl sm:text-4xl font-semibold text-zinc-50 leading-tight"
      : "text-2xl sm:text-3xl font-semibold text-foreground tracking-tight";
  const tClass =
    tone === "dark"
      ? "mt-3 text-sm sm:text-base text-zinc-400 max-w-xl"
      : "mt-3 text-sm sm:text-base text-foreground/60 max-w-xl";

  return (
    <div className={className}>
      <p className={qClass}>{question}</p>
      <Heading className={aClass}>{answer}</Heading>
      {thesis ? <p className={tClass}>{thesis}</p> : null}
    </div>
  );
}
