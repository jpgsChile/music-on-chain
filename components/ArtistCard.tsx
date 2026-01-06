import Link from "next/link";
import Image from "next/image";
import { Artist } from "@/types";
import { formatAddress } from "@/lib/utils";

interface ArtistCardProps {
  artist: Artist;
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="block border border-border rounded-lg p-6 bg-background hover:border-accent/30 transition-all hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="flex items-start gap-4">
        {artist.avatar && (
          <div className="flex-shrink-0">
            <Image
              src={artist.avatar}
              alt={artist.name}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover border-2 border-border"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {artist.name}
          </h3>
          {artist.bio && (
            <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
              {artist.bio}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="font-mono">{formatAddress(artist.walletAddress)}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-foreground/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

