"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/core";

export function AppProviders({ children, locale = "en" }: { children: ReactNode; locale?: Locale }) {
  return (
    <LocaleProvider initialLocale={locale}><QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider></LocaleProvider>
  );
}
