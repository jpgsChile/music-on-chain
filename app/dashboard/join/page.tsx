"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { StudioLoading, StudioPageHeader } from "@/components/studio/StudioStates";

function JoinInviteInner() {
  const locale = useLocale();
  const t = getTranslations(locale).studio.collaborators;
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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
      setError(typeof data?.error === "string" ? data.error : t.joinError);
      return;
    }
    setStatus("ok");
  }

  return (
    <div>
      <StudioPageHeader eyebrow={t.joinEyebrow} title={t.joinTitle} subtitle={t.joinSubtitle} />
      {!token ? (
        <p className="text-sm text-foreground/60">{t.joinMissing}</p>
      ) : status === "ok" ? (
        <p className="text-sm text-foreground">{t.joinSuccess}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-foreground/70">{t.joinHint}</p>
          <button
            type="button"
            onClick={() => void accept()}
            disabled={status === "working"}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {status === "working" ? t.joinWorking : t.joinCta}
          </button>
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
