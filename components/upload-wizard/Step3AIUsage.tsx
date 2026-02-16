"use client";

interface Step3AIUsageProps {
  aiUsage: boolean;
  aiUsageDescription: string;
  onAiUsageChange: (v: boolean) => void;
  onDescriptionChange: (v: string) => void;
  t: Record<string, string>;
}

export default function Step3AIUsage({
  aiUsage,
  aiUsageDescription,
  onAiUsageChange,
  onDescriptionChange,
  t,
}: Step3AIUsageProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70">{t.step3Desc}</p>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">¿Utilizaste IA?</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="aiUsage" checked={aiUsage} onChange={() => onAiUsageChange(true)} />
            <span>{t.aiUsageYes}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="aiUsage" checked={!aiUsage} onChange={() => onAiUsageChange(false)} />
            <span>{t.aiUsageNo}</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.aiUsageDescription}</label>
        <textarea value={aiUsageDescription} onChange={(e) => onDescriptionChange(e.target.value)} placeholder={t.aiUsageDescription} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" />
      </div>
    </div>
  );
}
