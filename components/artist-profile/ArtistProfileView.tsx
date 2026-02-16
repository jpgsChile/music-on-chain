"use client";

import type { ArtistProfileRecord } from "@/lib/artist-profile/types";

interface ArtistProfileViewProps {
  profile: ArtistProfileRecord | null;
  /** Optional: show compact card style */
  compact?: boolean;
}

export default function ArtistProfileView({ profile, compact }: ArtistProfileViewProps) {
  if (!profile) return null;

  const { artisticName, country, creativeRoles, defaultRoyaltySplits } = profile;

  if (compact) {
    return (
      <div className="text-sm text-foreground/80 space-y-1">
        {artisticName && <p className="font-medium text-foreground">{artisticName}</p>}
        {country && <p>{country}</p>}
        {creativeRoles?.length > 0 && (
          <p className="text-foreground/60">
            {creativeRoles.join(", ")}
          </p>
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
              {defaultRoyaltySplits
                .map((s) => `${s.role} ${s.percentage}%`)
                .join(", ")}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
