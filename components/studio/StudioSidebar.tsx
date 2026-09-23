"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import { useLocale } from "@/lib/locale/LocaleContext";
import { useAuth } from "@/lib/auth/useAuth";
import { useCBindSession } from "@/lib/auth/useCBindSession";
import { StudioIdentityProvider } from "@/lib/identity/StudioIdentity";
import ConnectArtist from "@/components/ConnectArtist";

const NAV = [
  { id: "dashboard", href: "/dashboard" },
  { id: "channel", href: "/dashboard/channel" },
  { id: "music", href: "/dashboard/music" },
  { id: "release", href: "/dashboard/release" },
  { id: "collaborators", href: "/dashboard/collaborators" },
  { id: "royalties", href: "/dashboard/royalties" },
  { id: "sales", href: "/dashboard/sales" },
  { id: "analytics", href: "/dashboard/analytics" },
  { id: "campaigns", href: "/dashboard/campaigns" },
  { id: "support", href: "/dashboard/support" },
  { id: "settings", href: "/dashboard/settings" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname === "/dashboard/" ||
      pathname.startsWith("/dashboard/tickets")
    );
  }
  if (href === "/dashboard/music") {
    return pathname.startsWith("/dashboard/music") || pathname.startsWith("/dashboard/canciones");
  }
  if (href === "/dashboard/release") {
    return pathname.startsWith("/dashboard/release") || pathname.startsWith("/dashboard/upload");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StudioSidebar() {
  const locale = useLocale();
  const t = getTranslations(locale).studio;
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="lg:sticky lg:top-20">
        <p className="px-3 mb-3 text-[11px] uppercase tracking-[0.18em] text-foreground/40">
          {t.brand}
        </p>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-foreground/65 hover:text-foreground hover:bg-border/30"
                }`}
              >
                {t.nav[item.id]}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function StudioAuthGate({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = getTranslations(locale);
  const { authenticated, ready, user } = useAuth();
  const session = useCBindSession(authenticated);

  if (!ready || (authenticated && session.loading)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-foreground/60 text-sm">
        {t.studio.loading}
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-accent mb-3">
            {t.studio.brand}
          </p>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {t.auth.connectAsArtist}
          </h1>
          <p className="text-sm text-foreground/60 mb-6">{t.studio.gateDesc}</p>
          <div className="flex justify-center">
            <ConnectArtist
              variant="modal"
              className="px-6 py-3 rounded-xl font-medium bg-accent text-background hover:bg-accent-hover"
            />
          </div>
        </div>
      </div>
    );
  }

  if (session.error || !session.binding) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-foreground/60 text-sm px-4 text-center">
        {t.studio.sessionError}
      </div>
    );
  }

  return (
    <StudioIdentityProvider
      value={{
        actorRef: session.binding.actorRef,
        walletAddress: user?.wallet?.address ?? null,
      }}
    >
      {children}
    </StudioIdentityProvider>
  );
}
