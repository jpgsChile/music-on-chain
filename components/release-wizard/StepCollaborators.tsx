"use client";

import {
  COLLABORATOR_ROLES,
  type ReleaseCollaborator,
  type CollaboratorRole,
  type ReleaseValidationErrors,
} from "@/types/upload";

type T = Record<string, string>;

interface Props {
  soloCreator: boolean;
  collaborators: ReleaseCollaborator[];
  royaltyTotal: number;
  errors: ReleaseValidationErrors;
  t: T;
  onSolo: (solo: boolean) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, partial: Partial<ReleaseCollaborator>) => void;
}

export default function StepCollaborators({
  soloCreator,
  collaborators,
  royaltyTotal,
  errors,
  t,
  onSolo,
  onAdd,
  onRemove,
  onUpdate,
}: Props) {
  const sumOk = Math.abs(royaltyTotal - 100) < 0.01;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t.step3Title}</h2>
        <p className="mt-1 text-sm text-foreground/55">{t.step3Desc}</p>
      </div>

      <button
        type="button"
        onClick={() => onSolo(true)}
        className={`w-full rounded-2xl border px-5 py-4 text-left transition-colors ${
          soloCreator
            ? "border-accent/50 bg-accent/10"
            : "border-border hover:border-foreground/25"
        }`}
      >
        <p className="text-sm font-semibold text-foreground">{t.soloTitle}</p>
        <p className="mt-1 text-sm text-foreground/55">{t.soloDesc}</p>
        {soloCreator ? (
          <p className="mt-3 text-xs font-mono text-accent">{t.soloSplit}</p>
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => {
          onSolo(false);
          if (collaborators.length === 0) onAdd();
        }}
        className={`w-full rounded-2xl border px-5 py-4 text-left transition-colors ${
          !soloCreator
            ? "border-accent/50 bg-accent/10"
            : "border-border hover:border-foreground/25"
        }`}
      >
        <p className="text-sm font-semibold text-foreground">{t.collabTitle}</p>
        <p className="mt-1 text-sm text-foreground/55">{t.collabDesc}</p>
      </button>

      {!soloCreator ? (
        <div className="space-y-4">
          {collaborators.map((c, i) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-background/80 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {t.collaborator} {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  className="text-xs text-foreground/45 hover:text-red-400"
                >
                  {t.remove}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">{t.name}</label>
                  <input
                    value={c.name}
                    onChange={(e) => onUpdate(c.id, { name: e.target.value })}
                    placeholder={t.namePlaceholder}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">{t.email}</label>
                  <input
                    type="email"
                    value={c.email}
                    onChange={(e) => onUpdate(c.id, { email: e.target.value })}
                    placeholder={t.emailPlaceholder}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">{t.role}</label>
                  <select
                    value={c.role}
                    onChange={(e) =>
                      onUpdate(c.id, { role: e.target.value as CollaboratorRole })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                  >
                    {COLLABORATOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {t[`role_${role}`] || role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">
                    {t.royaltyPct}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={c.percentage}
                      onChange={(e) =>
                        onUpdate(c.id, { percentage: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                    />
                    <span className="text-sm text-foreground/50">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAdd}
            className="text-sm font-medium text-accent hover:underline"
          >
            + {t.addCollaborator}
          </button>

          <div
            className={`rounded-xl border px-4 py-3 flex items-center justify-between text-sm ${
              sumOk
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/5 text-amber-400"
            }`}
          >
            <span>{t.royaltyTotal}</span>
            <span className="font-mono font-medium">{royaltyTotal.toFixed(1)}% / 100%</span>
          </div>
        </div>
      ) : null}

      {errors.collaborators ? (
        <p className="text-sm text-red-400">{errors.collaborators}</p>
      ) : null}
    </div>
  );
}
