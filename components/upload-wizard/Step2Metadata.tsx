"use client";

interface Step2MetadataProps {
  title: string;
  genre: string;
  language: string;
  onTitleChange: (v: string) => void;
  onGenreChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  errors: Partial<{ title: string }>;
  t: Record<string, string>;
}

export default function Step2Metadata({
  title,
  genre,
  language,
  onTitleChange,
  onGenreChange,
  onLanguageChange,
  errors,
  t,
}: Step2MetadataProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70">{t.step2Desc}</p>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.titlePlaceholder} *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t.titlePlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          maxLength={200}
        />
        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.genrePlaceholder}</label>
        <input
          type="text"
          value={genre}
          onChange={(e) => onGenreChange(e.target.value)}
          placeholder={t.genrePlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t.languagePlaceholder}</label>
        <input
          type="text"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          placeholder={t.languagePlaceholder}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        />
      </div>
    </div>
  );
}
