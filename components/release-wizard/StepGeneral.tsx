"use client";

import { useRef } from "react";
import {
  RELEASE_TYPES,
  GENRES,
  LANGUAGES,
  type ReleaseType,
  type ReleaseValidationErrors,
} from "@/types/upload";
import { getAcceptedCoverTypes } from "@/lib/upload/validation";

type T = Record<string, string>;

interface Props {
  title: string;
  releaseType: ReleaseType;
  language: string;
  primaryGenre: string;
  secondaryGenre: string;
  description: string;
  coverUrl: string | null;
  errors: ReleaseValidationErrors;
  t: T;
  onChange: (partial: {
    title?: string;
    releaseType?: ReleaseType;
    language?: string;
    primaryGenre?: string;
    secondaryGenre?: string;
    description?: string;
    coverFile?: File | null;
    coverUrl?: string | null;
  }) => void;
}

export default function StepGeneral({
  title,
  releaseType,
  language,
  primaryGenre,
  secondaryGenre,
  description,
  coverUrl,
  errors,
  t,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onCover = (file: File | null) => {
    if (!file) {
      onChange({ coverFile: null, coverUrl: null });
      return;
    }
    const url = URL.createObjectURL(file);
    onChange({ coverFile: file, coverUrl: url });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t.step1Title}</h2>
        <p className="mt-1 text-sm text-foreground/55">{t.step1Desc}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {t.fieldTitle}
        </label>
        <input
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t.titlePlaceholder}
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent/60"
        />
        {errors.title ? <p className="mt-1 text-sm text-red-400">{errors.title}</p> : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.releaseType}
        </label>
        <div className="flex flex-wrap gap-2">
          {RELEASE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ releaseType: type })}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors border ${
                releaseType === type
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-foreground/65 hover:border-foreground/30"
              }`}
            >
              {t[`type_${type}`] || type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t.language}
          </label>
          <select
            value={language}
            onChange={(e) => onChange({ language: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent/60"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          {errors.language ? (
            <p className="mt-1 text-sm text-red-400">{errors.language}</p>
          ) : null}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t.primaryGenre}
          </label>
          <select
            value={primaryGenre}
            onChange={(e) => onChange({ primaryGenre: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent/60"
          >
            <option value="">{t.genreSelect}</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {errors.primaryGenre ? (
            <p className="mt-1 text-sm text-red-400">{errors.primaryGenre}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {t.secondaryGenre}{" "}
          <span className="text-foreground/40 font-normal">({t.optional})</span>
        </label>
        <select
          value={secondaryGenre}
          onChange={(e) => onChange({ secondaryGenre: e.target.value })}
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent/60"
        >
          <option value="">{t.genreNone}</option>
          {GENRES.filter((g) => g !== primaryGenre).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {t.description}{" "}
          <span className="text-foreground/40 font-normal">({t.optional})</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          maxLength={1000}
          placeholder={t.descriptionPlaceholder}
          className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent/60 leading-relaxed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t.cover}
        </label>
        <div
          className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-border/10 aspect-square max-w-[220px] group cursor-pointer"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <span className="text-sm font-medium text-accent">{t.uploadCover}</span>
              <span className="mt-1 text-xs text-foreground/45">{t.coverHint}</span>
            </div>
          )}
          {coverUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-sm font-medium text-white">{t.changeCover}</span>
            </div>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptedCoverTypes()}
          className="hidden"
          onChange={(e) => onCover(e.target.files?.[0] ?? null)}
        />
        {errors.cover ? <p className="mt-2 text-sm text-red-400">{errors.cover}</p> : null}
      </div>
    </div>
  );
}
