"use client";

import type { RoyaltySplit } from "@/lib/artist-profile/types";

interface Step4RightsProps {
  useDefaultRights: boolean;
  royaltySplits: RoyaltySplit[];
  defaultSplits: RoyaltySplit[];
  onUseDefaultChange: (v: boolean) => void;
  onSplitsChange: (splits: RoyaltySplit[]) => void;
  error?: string;
  t: Record<string, string>;
}

export default function Step4Rights(props: Step4RightsProps) {
  const { useDefaultRights, royaltySplits, defaultSplits, onUseDefaultChange, onSplitsChange, error, t } = props;
  const splits = useDefaultRights ? defaultSplits : royaltySplits;
  const updateSplit = (i: number, field: keyof RoyaltySplit, value: string | number) => {
    const next = [...royaltySplits];
    next[i] = { ...next[i], [field]: field === "percentage" ? Number(value) || 0 : value };
    onSplitsChange(next);
  };
  const addSplit = () => onSplitsChange([...royaltySplits, { role: "author", percentage: 0 }]);
  const removeSplit = (i: number) => onSplitsChange(royaltySplits.filter((_, idx) => idx !== i));
  const sum = splits.reduce((a, s) => a + s.percentage, 0);
  const validSum = Math.abs(sum - 100) < 0.01;

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70">{t.step4Desc}</p>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="rightsSource" checked={useDefaultRights} onChange={() => onUseDefaultChange(true)} className="border-border" />
          <span>{t.useDefaultRights}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="rightsSource" checked={!useDefaultRights} onChange={() => onUseDefaultChange(false)} className="border-border" />
          <span>{t.overrideRights}</span>
        </label>
      </div>
      {useDefaultRights ? (
        <div className="rounded-lg border border-border bg-border/5 p-4 text-sm text-foreground/80">
          {defaultSplits.length === 0 ? <p>No tienes reparto por defecto. Define uno en tu perfil.</p> : (
            <ul>{defaultSplits.map((s, i) => <li key={i}>{s.role}: {s.percentage}%</li>)}</ul>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {royaltySplits.map((split, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="text" value={split.role} onChange={(e) => updateSplit(i, "role", e.target.value)} placeholder={t.role} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <input type="number" min={0} max={100} value={split.percentage} onChange={(e) => updateSplit(i, "percentage", e.target.value)} className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <span className="text-foreground/60">%</span>
              {royaltySplits.length > 1 && <button type="button" onClick={() => removeSplit(i)} className="text-foreground/60 hover:text-red-500">✕</button>}
            </div>
          ))}
          <button type="button" onClick={addSplit} className="text-sm text-accent hover:underline">{t.addRole}</button>
          {!validSum && splits.length > 0 && <p className="text-sm text-amber-600">El total debe ser 100%.</p>}
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
