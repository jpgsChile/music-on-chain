"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useArtistProfile } from "@/lib/artist-profile/useArtistProfile";
import {
  CHANNEL_SOCIAL_KEYS,
  type ArtistChannelSocials,
  type ChannelSocialKey,
} from "@/lib/artist-profile/types";
import { getArtistByWallet } from "@/data/artists";
import ChannelPreview, { type ChannelDraft } from "@/components/studio/ChannelPreview";
import { SOCIAL_LABELS } from "@/components/ArtistSocials";
import {
  StudioEmptyState,
  StudioLoading,
  StudioProgress,
} from "@/components/studio/StudioStates";

const AUTOSAVE_MS = 900;
const MAX_IMAGE_BYTES = 900_000;
const BIO_MAX = 500;

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("too_large"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

function emptySocials(): ArtistChannelSocials {
  return {};
}

function draftFromSources(
  profile: ReturnType<typeof useArtistProfile>["profile"],
  catalog: ReturnType<typeof getArtistByWallet>
): ChannelDraft {
  return {
    artisticName: profile?.artisticName?.trim() || catalog?.name || "",
    username: profile?.username?.trim() || catalog?.slug || "",
    biography: profile?.biography?.trim() || catalog?.description || "",
    bannerUrl: profile?.bannerUrl?.trim() || catalog?.coverUrl || "",
    avatarUrl: profile?.avatarUrl?.trim() || catalog?.logoUrl || "",
    socials: {
      ...emptySocials(),
      ...(catalog?.socials || {}),
      ...(profile?.socials || {}),
    },
    verified: Boolean(profile?.verified),
  };
}

function completeness(draft: ChannelDraft): number {
  let n = 0;
  if (draft.artisticName.trim()) n += 1;
  if (draft.username.trim()) n += 1;
  if (draft.biography.trim()) n += 1;
  if (draft.avatarUrl.trim()) n += 1;
  if (draft.bannerUrl.trim()) n += 1;
  if (CHANNEL_SOCIAL_KEYS.some((k) => draft.socials[k]?.trim())) n += 1;
  return n;
}

interface ChannelEditorProps {
  actorRef: string;
  wallet?: string;
}

export default function ChannelEditor({ actorRef, wallet = "" }: ChannelEditorProps) {
  const locale = useLocale();
  const t = getTranslations(locale).studio.channel;
  const { profile, loading, saveProfile } = useArtistProfile(wallet, actorRef);
  const catalog = useMemo(() => getArtistByWallet(wallet), [wallet]);

  const [draft, setDraft] = useState<ChannelDraft | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraft = useRef<ChannelDraft | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    const next = draftFromSources(profile, catalog);
    setDraft(next);
    latestDraft.current = next;
    setHydrated(true);
  }, [loading, profile, catalog]);

  const persist = useCallback(
    async (next: ChannelDraft) => {
      setStatus("saving");
      try {
        await saveProfile({
          artisticName: next.artisticName.trim() || null,
          username: next.username.trim() || null,
          biography: next.biography.trim() || null,
          bannerUrl: next.bannerUrl.trim() || null,
          avatarUrl: next.avatarUrl.trim() || null,
          socials: Object.fromEntries(
            CHANNEL_SOCIAL_KEYS.map((k) => [k, next.socials[k]?.trim() || ""]).filter(
              ([, v]) => Boolean(v)
            )
          ) as ArtistChannelSocials,
        });
        setStatus("saved");
        window.setTimeout(() => {
          setStatus((s) => (s === "saved" ? "idle" : s));
        }, 2200);
      } catch {
        setStatus("error");
      }
    },
    [saveProfile]
  );

  const scheduleSave = useCallback(
    (next: ChannelDraft) => {
      latestDraft.current = next;
      setStatus("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(next);
      }, AUTOSAVE_MS);
    },
    [persist]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const patch = useCallback(
    (partial: Partial<ChannelDraft>) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...partial };
        startTransition(() => scheduleSave(next));
        return next;
      });
    },
    [scheduleSave]
  );

  const patchSocial = useCallback(
    (key: ChannelSocialKey, value: string) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          socials: { ...prev.socials, [key]: value },
        };
        startTransition(() => scheduleSave(next));
        return next;
      });
    },
    [scheduleSave]
  );

  const onPickImage = async (
    file: File | undefined,
    field: "bannerUrl" | "avatarUrl"
  ) => {
    if (!file) return;
    setImageError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      patch({ [field]: dataUrl });
    } catch (e) {
      setImageError(
        e instanceof Error && e.message === "too_large" ? t.imageTooLarge : t.imageFailed
      );
    }
  };

  if (loading || !hydrated || !draft) {
    return <StudioLoading label={t.loading} />;
  }

  const score = completeness(draft);
  const configured = score > 0;
  const statusLabel =
    status === "saving"
      ? t.autosaveSaving
      : status === "saved"
        ? t.autosaveSaved
        : status === "dirty"
          ? t.autosavePending
          : status === "error"
            ? t.autosaveError
            : t.autosaveIdle;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <StudioProgress label={t.progressLabel} current={score} total={6} />
        </div>
        <div
          className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs sm:self-center ${
            status === "error"
              ? "border-red-500/40 text-red-400"
              : status === "saved"
                ? "border-emerald-500/40 text-emerald-400"
                : "border-border text-foreground/55"
          }`}
          aria-live="polite"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "saving" || status === "dirty"
                ? "animate-pulse bg-accent"
                : status === "saved"
                  ? "bg-emerald-400"
                  : status === "error"
                    ? "bg-red-400"
                    : "bg-foreground/30"
            }`}
          />
          {statusLabel}
        </div>
      </div>

      {!configured ? (
        <StudioEmptyState
          title={t.emptyTitle}
          description={t.emptyDesc}
          ctaLabel={t.emptyCta}
          onCta={() => document.getElementById("channel-name")?.focus()}
        />
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="space-y-8">
          {/* Identity media */}
          <section className="rounded-2xl border border-border bg-background/80 overflow-hidden">
            <div className="relative aspect-[21/9] max-h-[220px] bg-gradient-to-br from-border/70 via-background to-border/30 group">
              {draft.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.bannerUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity" />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {t.changeBanner}
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void onPickImage(e.target.files?.[0], "bannerUrl")}
              />
            </div>

            <div className="px-5 pb-5">
              <div className="relative -mt-10 mb-5 flex items-end gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="group relative h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-border/50 shadow-lg"
                  aria-label={t.changeAvatar}
                >
                  {draft.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl text-foreground/30">
                      {(draft.artisticName || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.changeAvatar}
                  </span>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void onPickImage(e.target.files?.[0], "avatarUrl")}
                />
                <div className="pb-1 text-xs text-foreground/45">{t.imageHint}</div>
              </div>
              {imageError ? (
                <p className="mb-3 text-sm text-red-400">{imageError}</p>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label htmlFor="channel-name" className="block text-sm font-medium text-foreground mb-1.5">
                    {t.artistName}
                  </label>
                  <input
                    id="channel-name"
                    value={draft.artisticName}
                    onChange={(e) => patch({ artisticName: e.target.value })}
                    placeholder={t.artistNamePlaceholder}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none focus:border-accent/60"
                  />
                </div>

                <div>
                  <label htmlFor="channel-username" className="block text-sm font-medium text-foreground mb-1.5">
                    {t.username}
                  </label>
                  <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-accent/60">
                    <span className="pl-3.5 text-foreground/40 font-mono text-sm">@</span>
                    <input
                      id="channel-username"
                      value={draft.username.replace(/^@+/, "")}
                      onChange={(e) =>
                        patch({
                          username: e.target.value.replace(/^@+/, "").toLowerCase(),
                        })
                      }
                      placeholder={t.usernamePlaceholder}
                      className="w-full bg-transparent px-2 py-2.5 font-mono text-sm text-foreground outline-none"
                      maxLength={30}
                      autoComplete="off"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-foreground/45">{t.usernameHint}</p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="channel-bio" className="text-sm font-medium text-foreground">
                      {t.biography}
                    </label>
                    <span className="text-xs font-mono text-foreground/40">
                      {draft.biography.length}/{BIO_MAX}
                    </span>
                  </div>
                  <textarea
                    id="channel-bio"
                    value={draft.biography}
                    maxLength={BIO_MAX}
                    rows={4}
                    onChange={(e) => patch({ biography: e.target.value })}
                    placeholder={t.biographyPlaceholder}
                    className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent/60 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Socials */}
          <section className="rounded-2xl border border-border bg-background/80 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-foreground">{t.socialsTitle}</h3>
            <p className="mt-1 text-sm text-foreground/55">{t.socialsDesc}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {CHANNEL_SOCIAL_KEYS.map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-foreground/70">
                    {SOCIAL_LABELS[key]}
                  </label>
                  <input
                    type="url"
                    value={draft.socials[key] || ""}
                    onChange={(e) => patchSocial(key, e.target.value)}
                    placeholder={t.socialPlaceholder}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Verification (future) */}
          <section className="rounded-2xl border border-dashed border-border bg-border/5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  {t.verifiedTitle}
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground/45">
                    {t.comingSoon}
                  </span>
                </h3>
                <p className="mt-1 text-sm text-foreground/55 max-w-lg">{t.verifiedDesc}</p>
              </div>
              <button
                type="button"
                disabled
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-foreground/35 cursor-not-allowed"
              >
                {t.requestVerification}
              </button>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start space-y-3">
          <ChannelPreview
            draft={draft}
            worksCount={catalog?.tracks.length ?? 0}
            labels={{
              previewTitle: t.previewTitle,
              previewHint: t.previewHint,
              verifiedSoon: t.verifiedSoon,
              placeholderName: t.placeholderName,
              placeholderBio: t.placeholderBio,
              worksLabel: t.worksLabel,
            }}
          />
          {catalog ? (
            <a
              href={`/artist/${catalog.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-accent hover:underline"
            >
              {t.viewPublic} →
            </a>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
