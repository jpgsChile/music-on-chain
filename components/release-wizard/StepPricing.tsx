"use client";

import {
  PRICING_MODELS,
  type PricingModel,
  type ReleaseValidationErrors,
} from "@/types/upload";

type T = Record<string, string>;

interface Props {
  pricingModels: PricingModel[];
  priceUsdc: number;
  errors: ReleaseValidationErrors;
  t: T;
  onToggleModel: (model: PricingModel) => void;
  onPrice: (price: number) => void;
}

export default function StepPricing({
  pricingModels,
  priceUsdc,
  errors,
  t,
  onToggleModel,
  onPrice,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t.step4Title}</h2>
        <p className="mt-1 text-sm text-foreground/55">{t.step4Desc}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.pricingModels}
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRICING_MODELS.map((model) => {
            const active = pricingModels.includes(model);
            return (
              <button
                key={model}
                type="button"
                onClick={() => onToggleModel(model)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-accent/50 bg-accent/10"
                    : "border-border hover:border-foreground/25"
                }`}
              >
                <p className="text-sm font-medium text-foreground">
                  {t[`pricing_${model}`] || model}
                </p>
                <p className="mt-0.5 text-xs text-foreground/50">
                  {t[`pricing_${model}_desc`] || ""}
                </p>
              </button>
            );
          })}
        </div>
        {errors.pricingModels ? (
          <p className="mt-2 text-sm text-red-400">{errors.pricingModels}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {t.priceUsdc}
        </label>
        <div className="flex items-center gap-2 max-w-xs">
          <input
            type="number"
            min={0}
            step={0.01}
            value={priceUsdc}
            onChange={(e) => onPrice(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent/60 font-mono"
          />
          <span className="text-sm font-medium text-foreground/60 shrink-0">USDC</span>
        </div>
        {errors.priceUsdc ? (
          <p className="mt-1 text-sm text-red-400">{errors.priceUsdc}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-border/10 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-foreground/40 mb-1">
          {t.network}
        </p>
        <p className="text-sm font-medium text-foreground">{t.networkBase}</p>
        <p className="mt-1 text-xs text-foreground/50">{t.networkHint}</p>
      </div>
    </div>
  );
}
