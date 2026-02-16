"use client";

import { useState, useEffect } from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useArtistProfile } from "@/lib/artist-profile/useArtistProfile";
import { CREATIVE_ROLES } from "@/lib/artist-profile/types";

interface ArtistProfileFormProps {
  wallet: string;
}

export default function ArtistProfileForm({ wallet }: ArtistProfileFormProps) {
  const locale = useLocale();
  const t = getTranslations(locale).dashboard as Record<string, string>;
  const { profile, loading, error, saveProfile } = useArtistProfile(wallet);
  const [artisticName, setArtisticName] = useState("");
  const [country, setCountry] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [splits, setSplits] = useState<{ role: string; percentage: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (profile) {
      setArtisticName(profile.artisticName ?? "");
      setCountry(profile.country ?? "");
      setRoles(profile.creativeRoles ?? []);
      setSplits(profile.defaultRoyaltySplits?.length ? profile.defaultRoyaltySplits : [{ role: "composer", percentage: 100 }]);
    } else if (!loading) {
      setSplits([{ role: "composer", percentage: 100 }]);
    }
  }, [profile, loading]);

  const toggleRole = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const updateSplit = (i: number, field: "role" | "percentage", value: string | number) => {
    setSplits((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === "percentage" ? Number(value) || 0 : value };
      return next;
    });
  };

  const addSplit = () => {
    setSplits((prev) => [...prev, { role: "author", percentage: 0 }]);
  };

  const removeSplit = (i: number) => {
    setSplits((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sum = splits.reduce((a, s) => a + s.percentage, 0);
    if (Math.abs(sum - 100) > 0.01) {
      setMessage("error");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveProfile({
        artisticName: artisticName.trim() || null,
        country: country.trim() || null,
        creativeRoles: roles,
        defaultRoyaltySplits: splits,
      });
      setMessage("success");
    } catch {
      setMessage("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="border border-border rounded-lg p-6 bg-background">
        <p className="text-foreground/60">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6 bg-background">
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {t.artistProfile}
      </h3>
      <p className="text-sm text-foreground/60 mb-6">
        {t.artistProfileDesc}
      </p>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t.artisticName}
          </label>
          <input
            type="text"
            value={artisticName}
            onChange={(e) => setArtisticName(e.target.value)}
            placeholder="Ej. CLEAVER"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t.country}
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Ej. Chile"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t.creativeRoles}
          </label>
          <div className="flex flex-wrap gap-2">
            {CREATIVE_ROLES.map((role) => (
              <label key={role} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="rounded border-border"
                />
                <span className="text-foreground/90">{role}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">
              {t.defaultRoyaltySplits}
            </label>
            <button
              type="button"
              onClick={addSplit}
              className="text-sm text-accent hover:underline"
            >
              {t.addSplit}
            </button>
          </div>
          {splits.map((split, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={split.role}
                onChange={(e) => updateSplit(i, "role", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                placeholder="Rol"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={split.percentage}
                onChange={(e) => updateSplit(i, "percentage", e.target.value)}
                className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
              <span className="self-center text-foreground/60">%</span>
              {splits.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSplit(i)}
                  className="text-foreground/60 hover:text-red-500 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {splits.reduce((a, s) => a + s.percentage, 0) !== 100 && (
            <p className="text-xs text-amber-600 mt-1">{t.royaltyMustSum100}</p>
          )}
        </div>
        {message === "success" && (
          <p className="text-sm text-emerald-600">{t.profileSaved}</p>
        )}
        {message === "error" && (
          <p className="text-sm text-red-500">{t.royaltyMustSum100}</p>
        )}
        <button
          type="submit"
          disabled={saving || Math.abs(splits.reduce((a, s) => a + s.percentage, 0) - 100) > 0.01}
          className="px-4 py-2 rounded-lg bg-accent text-background font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? t.loading : t.saveProfile}
        </button>
      </form>
    </div>
  );
}
