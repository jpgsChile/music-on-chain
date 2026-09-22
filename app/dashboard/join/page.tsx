"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
import { StudioLoading, StudioPageHeader } from "@/components/studio/StudioStates";

type InvitePreview = {
  displayName: string;
  releaseTitle: string;
  currentIsOwner: boolean;
  alreadyBound: boolean;
  boundToCurrentUser: boolean;
  canAccept: boolean;
};

function joinErrorCopy(
  code: string,
  t: ReturnType<typeof getTranslations>["studio"]["collaborators"],
  name = ""
) {
  if (code === "OWNER_CANNOT_ACCEPT_COLLABORATOR_INVITE") {
    return t.joinWrongAccount.replace("{{name}}", name);
  }
  if (code === "ALREADY_BOUND") return t.joinAlreadyBound;
  if (code === "INVALID_INVITE") return t.joinInvalid;
  return t.joinError;
}

function JoinInviteInner() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.collaborators;
  const { logout } = useAuth();
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/participations/accept?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && data.value) {
          setPreview(data.value as InvitePreview);
          if (data.value.boundToCurrentUser) setStatus("ok");
        } else if (typeof data?.error === "string") {
          setStatus("error");
          setError(joinErrorCopy(data.error, t, data.value?.displayName));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setError(t.joinError);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  async function accept() {
    if (!token) {
      setStatus("error");
      setError(t.joinMissing);
      return;
    }
    setStatus("working");
    setError(null);
    const res = await fetch("/api/participations/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus("error");
      setError(joinErrorCopy(typeof data?.error === "string" ? data.error : "", t, preview?.displayName));
      return;
    }
    setStatus("ok");
  }

  const wrongAccount = Boolean(preview?.currentIsOwner && !preview.alreadyBound);
  const hint = wrongAccount
    ? t.joinWrongAccount.replace("{{name}}", preview?.displayName ?? "")
    : t.joinHint;

  return (
    <div>
      <StudioPageHeader eyebrow={t.joinEyebrow} title={t.joinTitle} subtitle={t.joinSubtitle} />
      {!token ? (
        <p className="text-sm text-foreground/60">{t.joinMissing}</p>
      ) : status === "ok" ? (
        <p className="text-sm text-foreground">{t.joinSuccess}</p>
      ) : (
        <div className="space-y-3">
          {preview ? (
            <p className="text-sm text-foreground">
              {preview.displayName} · {preview.releaseTitle}
            </p>
          ) : null}
          <p className="text-sm text-foreground/70">{hint}</p>
          {wrongAccount ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border/30"
            >
              {t.joinSwitchAccount}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void accept()}
              disabled={status === "working" || preview?.canAccept === false}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {status === "working" ? t.joinWorking : t.joinCta}
            </button>
          )}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      )}
    </div>
  );
}

export default function JoinInvitePage() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.collaborators;
  return (
    <Suspense fallback={<StudioLoading label={t.loading} />}>
      <JoinInviteInner />
    </Suspense>
  );
}
