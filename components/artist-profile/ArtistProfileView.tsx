"use client";

import Image from "next/image";
import ArtistSocials from "@/components/ArtistSocials";
import type { ArtistProfileRecord } from "@/lib/artist-profile/types";

interface ArtistProfileViewProps {
  profile: ArtistProfileRecord | null;
  /** Optional: show compact card style */
  compact?: boolean;
}

export default function ArtistProfileView({ profile, compact }: ArtistProfileViewProps) {
  if (!profile) return null;

  const {
    artisticName,
    username,
    biography,
    country,
    creativeRoles,
    defaultRoyaltySplits,
    bannerUrl,
    avatarUrl,
    socials,
    verified,
  } = profile;

  const hasChannelMedia = Boolean(bannerUrl || avatarUrl || biography || username);
  const handle = username?.trim() ? `@${username.replace(/^@+/, "")}` : null;

  if (compact && hasChannelMedia) {
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-border/5">
        {bannerUrl ? (
          <div className="relative aspect-[21/9] max-h-[140px] bg-border">
            {bannerUrl.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <Image src={bannerUrl} alt="" fill className="object-cover" sizes="640px" unoptimized />
            )}
          </div>
        ) : null}
        <div className="p-4 flex gap-3 items-start">
          {avatarUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-border">
              {avatarUrl.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Image src={avatarUrl} alt="" fill className="object-cover" sizes="48px" unoptimized />
              )}
            </div>
          ) : null}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              {artisticName ? (
                <p className="font-medium text-foreground truncate">{artisticName}</p>
              ) : null}
              {verified ? (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-background">
                  ✓
                </span>
              ) : null}
            </div>
            {handle ? <p className="text-xs font-mono text-foreground/50">{handle}</p> : null}
            {biography ? (
              <p className="text-sm text-foreground/70 line-clamp-3 whitespace-pre-wrap">{biography}</p>
            ) : null}
            <ArtistSocials socials={socials} className="pt-1" />
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="text-sm text-foreground/80 space-y-1">
        {artisticName && <p className="font-medium text-foreground">{artisticName}</p>}
        {handle && <p className="font-mono text-xs text-foreground/50">{handle}</p>}
        {country && <p>{country}</p>}
        {creativeRoles?.length > 0 && (
          <p className="text-foreground/60">{creativeRoles.join(", ")}</p>
        )}
      </div>
    );
  }

  return (
    <section className="border border-border rounded-xl p-4 bg-border/5">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3">
        Perfil
      </h3>
      <div className="space-y-2 text-sm">
        {artisticName && (
          <p>
            <span className="text-foreground/60">Nombre artístico:</span>{" "}
            <span className="text-foreground">{artisticName}</span>
          </p>
        )}
        {handle && (
          <p>
            <span className="text-foreground/60">Usuario:</span>{" "}
            <span className="text-foreground font-mono">{handle}</span>
          </p>
        )}
        {biography && (
          <p className="text-foreground/80 whitespace-pre-wrap">{biography}</p>
        )}
        {country && (
          <p>
            <span className="text-foreground/60">País:</span>{" "}
            <span className="text-foreground">{country}</span>
          </p>
        )}
        {creativeRoles?.length > 0 && (
          <p>
            <span className="text-foreground/60">Roles:</span>{" "}
            <span className="text-foreground">{creativeRoles.join(", ")}</span>
          </p>
        )}
        {defaultRoyaltySplits?.length > 0 && (
          <p>
            <span className="text-foreground/60">Reparto por defecto:</span>{" "}
            <span className="text-foreground">
              {defaultRoyaltySplits.map((s) => `${s.role} ${s.percentage}%`).join(", ")}
            </span>
          </p>
        )}
        <ArtistSocials socials={socials} className="pt-2" />
      </div>
    </section>
  );
}
