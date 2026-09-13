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
  const { t } = await getServerI18n();
  return { title: "shopupu", description: t("demo.metadata") };
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
