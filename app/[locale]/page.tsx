import Link from "next/link";

import Header from "@/components/header/Header";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function LandingPage({
  params,
}: {
  params: { locale: Locale };
}) {
  const dict = await getDictionary(params.locale);

  const modalContent = (
    <p className="text-sm leading-relaxed">
      {dict.header.modal.line1}
      <br />
      {dict.header.modal.line2.replace("{{percent}}", "98")}
      <br />
      {dict.header.modal.line3}
      <br />
      <strong>{dict.header.modal.line4}</strong>
    </p>
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <Header
        brand={dict.header.brand}
        whatIsLabel={dict.header.whatIs}
        signInLabel={dict.header.signIn}
        modalContent={modalContent}
        closeLabel={dict.header.modal.close}
      />

      <section className="px-4 py-10">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold">{dict.landing.title}</h1>
          <p className="mt-3 text-sm opacity-80">{dict.landing.subtitle}</p>
          <div className="mt-6">
            <Link
              href={`/${params.locale}/artist/cleaver`}
              className="inline-flex items-center rounded-full bg-white text-black px-5 py-2 text-sm font-semibold"
            >
              {dict.landing.cta}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
