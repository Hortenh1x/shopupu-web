"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { enumLabel, formatDate, formatNumber, formatPrice, localeCookieName, translate, type Locale, type TranslationParams } from "./core";
import { localizedError } from "./errors";
import type { TranslationKey } from "./messages";

function createI18n(locale: Locale, setLocale: (value: Locale) => void) {
  return {
    locale, setLocale,
    t: (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params),
    formatPrice: (value: number | string, currency = "EUR") => formatPrice(value, locale, currency),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options),
    formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatDate(value, locale, options),
    statusLabel: (value: string) => enumLabel(locale, "status", value),
    genderLabel: (value: string) => enumLabel(locale, "gender", value),
    shippingLabel: (value: string) => enumLabel(locale, "shipping", value),
    roleLabel: (value: string) => enumLabel(locale, "role", value),
    errorMessage: (error: unknown) => localizedError(locale, error)
  };
}
const LocaleContext = createContext(createI18n("en", () => undefined));

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const router = useRouter();
  const linkedLocaleApplied = useRef(false);
  const value = useMemo(() => createI18n(locale, (next: Locale) => {
    if (next !== "en" && next !== "de") return;
    document.documentElement.lang = next;
    try {
      document.cookie = `${localeCookieName}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch { /* The current tab can still change language when cookies are blocked. */ }
    updateLocale(next);
    router.refresh();
  }), [locale, router]);
  useEffect(() => {
    if (linkedLocaleApplied.current) return;
    linkedLocaleApplied.current = true;
    // Only explicit email-link values override the saved preference; tokens/routes stay untouched.
    const linkedLocale = new URLSearchParams(window.location.search).get("lang");
    if ((linkedLocale === "en" || linkedLocale === "de") && linkedLocale !== locale) value.setLocale(linkedLocale);
  }, [locale, value]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useI18n() { return useContext(LocaleContext); }
