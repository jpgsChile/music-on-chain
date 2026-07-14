import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "@/components/Navigation";
import WagmiProviderWrapper from "@/components/WagmiProvider";
import { getLocaleFromCookie } from "@/lib/locale-server";
import { LocaleProvider } from "@/lib/locale/LocaleContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Music On Chain — Protocolo de derechos musicales",
  description:
    "Infraestructura escalable de propiedad, licencias y liquidación. Protocolo primero. Apps encima. Liquidación en Base.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromCookie();
  return (
    // suppressHydrationWarning: browser extensions (e.g. Bybit wallet) inject
    // attributes on <html>/<body> before React hydrates, causing false mismatches.
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <WagmiProviderWrapper>
          <LocaleProvider locale={locale}>
            <Navigation locale={locale} />
            {children}
          </LocaleProvider>
        </WagmiProviderWrapper>
      </body>
    </html>
  );
}
