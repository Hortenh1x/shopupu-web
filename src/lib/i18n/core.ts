import { messages, type TranslationKey } from "./messages";

export type Locale = "en" | "de";
export const localeCookieName = "shopupu.locale";
export type TranslationParams = Record<string, string | number>;
export function parseLocale(value: string | null | undefined): Locale { return value === "de" ? "de" : "en"; }
export function intlLocale(locale: Locale) { return locale === "de" ? "de-DE" : "en-IE"; }
export function translate(locale: Locale, key: TranslationKey, params: TranslationParams = {}): string {
  return messages[key][locale].replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder);
}
export function formatPrice(value: number | string, locale: Locale = "en", currency = "EUR") {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(Number(value));
}
export function formatNumber(value: number, locale: Locale = "en", options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}
export function formatDate(value: string | number | Date, locale: Locale = "en", options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(intlLocale(locale), options).format(date);
}
export function enumLabel(locale: Locale, group: "status" | "gender" | "shipping" | "role", value: string): string {
  const key = `${group}.${value}`;
  return key in messages ? translate(locale, key as TranslationKey) : value;
}
/** Locale selection contains no credentials. Read only in browser request paths. */
export function browserLocale(): Locale {
  return typeof document === "undefined" ? "en" : parseLocale(document.documentElement.lang);
}
