"use client";

type Props = {
  step: number;
  labels: string[];
};

export default function ReleaseProgress({ step, labels }: Props) {
  const total = labels.length;
  const pct = Math.round((step / total) * 100);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-foreground/60">
          Paso {step} de {total}
          <span className="text-foreground/40"> · </span>
          <span className="text-foreground/80">{labels[step - 1]}</span>
        </p>
        <span className="font-mono text-xs text-foreground/45">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="mt-4 hidden sm:grid grid-cols-5 gap-2">
        {labels.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li
              key={label}
              className={`rounded-lg px-2 py-2 text-center text-[11px] leading-tight border transition-colors ${
                active
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : done
                    ? "border-border bg-border/20 text-foreground/70"
                    : "border-transparent text-foreground/35"
              }`}
            >
              <span className="block font-mono mb-0.5">{n}</span>
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
