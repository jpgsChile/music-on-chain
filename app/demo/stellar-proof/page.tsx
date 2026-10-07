import type { Metadata } from "next";
import PublicCertifiedProofView from "@/components/public-proof/PublicCertifiedProofView";
import { getPrisma } from "@/lib/db";
import { readCertifiedHackathonProof } from "@/lib/fan-economy/public-proof/certifiedHackathonProof";
import { publicLiveRead } from "@/lib/fan-economy/public-proof/liveProbe";
import { getTranslations } from "@/lib/i18n";
import { getLocaleFromCookie } from "@/lib/locale-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromCookie();
  return { title: getTranslations(locale).publicProof.metaTitle };
}

/** Public certified receipt. No session, no selector, no write. */
export default async function PublicStellarProofPage() {
  const locale = await getLocaleFromCookie();
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return <PublicCertifiedProofView locale={locale} proof={{ available: false, liveNetworkStatus: "unavailable" }} />;
  }
  try {
    const proof = await readCertifiedHackathonProof(getPrisma(), { liveRead: publicLiveRead() });
    return <PublicCertifiedProofView locale={locale} proof={proof} />;
  } catch {
    return <PublicCertifiedProofView locale={locale} proof={{ available: false, liveNetworkStatus: "unavailable" }} />;
  }
}
