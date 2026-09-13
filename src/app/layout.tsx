import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StylistWidget } from "@/features/stylist/StylistWidget";
import { DemoNotice } from "@/components/layout/DemoNotice";
import { getServerI18n } from "@/lib/i18n/server";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display"
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono"
});

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerI18n();
  const description = t("demo.metadata");
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://shopupu.net"),
    title: { default: "shopupu", template: "%s · shopupu" },
    description,
    // Link previews: the icon doubles as the image so no real product photo is presented as merchandise.
    openGraph: { type: "website", siteName: "shopupu", title: "shopupu", description, locale: locale === "de" ? "de_DE" : "en_IE", images: ["/icon.svg"] },
    twitter: { card: "summary", title: "shopupu", description }
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale } = await getServerI18n();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <AppProviders locale={locale}>
          <DemoNotice />
          <SiteHeader />
          {children}
          <SiteFooter />
          <StylistWidget />
        </AppProviders>
      </body>
    </html>
  );
}
