"use client";

import Image from "next/image";
import ArtistSocials from "@/components/ArtistSocials";
import type { ArtistChannelSocials } from "@/lib/artist-profile/types";

export type ChannelDraft = {
  artisticName: string;
  username: string;
  biography: string;
  bannerUrl: string;
  avatarUrl: string;
  socials: ArtistChannelSocials;
  verified: boolean;
};

type Labels = {
  previewTitle: string;
  previewHint: string;
  verifiedSoon: string;
  placeholderName: string;
  placeholderBio: string;
  worksLabel: string;
};

interface ChannelPreviewProps {
  draft: ChannelDraft;
  labels: Labels;
  worksCount?: number;
}

function isRemoteSrc(src: string) {
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/");
}

export default function ChannelPreview({
  draft,
  labels,
  worksCount = 0,
}: ChannelPreviewProps) {
  const name = draft.artisticName.trim() || labels.placeholderName;
  const bio = draft.biography.trim() || labels.placeholderBio;
  const handle = draft.username.trim()
    ? `@${draft.username.trim().replace(/^@+/, "")}`
    : null;
  const banner = draft.bannerUrl.trim();
  const avatar = draft.avatarUrl.trim();

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-foreground/40">
            {labels.previewTitle}
          </p>
          <p className="text-xs text-foreground/50 mt-0.5">{labels.previewHint}</p>
        </div>
        {draft.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent">
            ✓
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[11px] text-foreground/45">
            {labels.verifiedSoon}
          </span>
        )}
      </div>

      <div className="relative aspect-[21/9] max-h-[200px] bg-gradient-to-br from-border/80 via-background to-border/40">
        {banner ? (
          isRemoteSrc(banner) && !banner.startsWith("data:") ? (
            <Image src={banner} alt="" fill className="object-cover" sizes="480px" unoptimized />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative px-5 pb-5 -mt-10">
        <div className="flex items-end gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-border/40 shadow-lg">
            {avatar ? (
              isRemoteSrc(avatar) && !avatar.startsWith("data:") ? (
                <Image src={avatar} alt="" fill className="object-cover" sizes="80px" unoptimized />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-foreground/30">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 pb-1 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
                {name}
              </h2>
              {draft.verified ? (
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-background"
                  title="Verificado"
                >
                  ✓
                </span>
              ) : null}
            </div>
            {handle ? (
              <p className="text-sm text-foreground/50 font-mono">{handle}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-foreground/70 whitespace-pre-wrap">
          {bio}
        </p>

        {worksCount > 0 ? (
          <p className="mt-3 text-xs text-foreground/45">
            {labels.worksLabel.replace("{{count}}", String(worksCount))}
          </p>
        ) : null}

        <div className="mt-4">
          <ArtistSocials socials={draft.socials} />
        </div>
      </div>
    </div>
  );
}
