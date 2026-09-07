import type { ArtistChannelSocials, ChannelSocialKey } from "@/lib/artist-profile/types";
import { CHANNEL_SOCIAL_KEYS } from "@/lib/artist-profile/types";

/** Legacy catalog socials + channel socials */
export type SocialLinksInput = ArtistChannelSocials & {
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

interface ArtistSocialsProps {
  socials: SocialLinksInput;
  className?: string;
  /** Show labels next to icons */
  showLabels?: boolean;
}

const LABELS: Record<ChannelSocialKey, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  website: "Web",
};

function IconSpotify({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function IconAppleMusic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.997 6.124c0-.738-.065-1.454-.172-2.142a3.257 3.257 0 0 0-2.466-2.53C19.895 1.248 18.25.99 15.99.99H8.009c-2.26 0-3.906.258-5.37.462A3.257 3.257 0 0 0 .174 3.982C.067 4.67.002 5.386.002 6.124v11.752c0 .738.065 1.454.172 2.142a3.257 3.257 0 0 0 2.466 2.53c1.464.204 3.11.462 5.37.462h7.981c2.26 0 3.905-.258 5.37-.462a3.257 3.257 0 0 0 2.466-2.53c.107-.688.172-1.404.172-2.142V6.124zm-6.72 6.846c0 1.647-1.304 2.982-2.91 2.982-1.607 0-2.91-1.335-2.91-2.982V7.32c.84.36 1.8.6 2.91.6v5.05c0 .54.42.96.96.96s.96-.42.96-.96V5.04c0-.18-.12-.36-.3-.42L11.2 3.48c-.24-.06-.48.12-.48.36v9.13c0 2.76 2.16 5.01 4.92 5.01 2.76 0 4.92-2.25 4.92-5.01v-1.98c-.66.36-1.38.6-2.28.6v1.38z" />
    </svg>
  );
}

function IconYouTube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.227-8.451L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconWebsite({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" />
    </svg>
  );
}

const ICONS: Record<ChannelSocialKey, React.ComponentType<{ className?: string }>> = {
  spotify: IconSpotify,
  appleMusic: IconAppleMusic,
  youtube: IconYouTube,
  tiktok: IconTikTok,
  instagram: IconInstagram,
  x: IconX,
  facebook: IconFacebook,
  website: IconWebsite,
};

export default function ArtistSocials({
  socials,
  className = "",
  showLabels = false,
}: ArtistSocialsProps) {
  const entries = CHANNEL_SOCIAL_KEYS.filter((key) => socials[key]?.trim());

  if (entries.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {entries.map((key) => {
        const href = socials[key]!;
        const Icon = ICONS[key];
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 rounded-full bg-foreground/10 text-foreground hover:bg-accent hover:text-background transition-colors ${
              showLabels ? "px-3 py-1.5 text-xs font-medium" : "w-10 h-10 justify-center"
            }`}
            aria-label={LABELS[key]}
            title={LABELS[key]}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {showLabels ? <span>{LABELS[key]}</span> : null}
          </a>
        );
      })}
    </div>
  );
}

export { LABELS as SOCIAL_LABELS, ICONS as SOCIAL_ICONS };
