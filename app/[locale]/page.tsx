import { redirect } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";

export default function LandingPage({
  params,
}: {
  params: { locale: Locale };
}) {
  redirect(`/${params.locale}/artist/cleaver`);
}
