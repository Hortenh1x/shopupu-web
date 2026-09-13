import { translate, type Locale } from "./core";
import type { TranslationKey } from "./messages";

const codes: Record<string, TranslationKey> = {
  SESSION_CHANGED: "error.session", NETWORK_ERROR: "error.network", STORAGE_UNAVAILABLE: "error.storage",
  CART_CHANGED: "error.cartChanged", EMAIL_DELIVERY_UNAVAILABLE: "error.email",
  PAYMENT_OUTCOME_UNKNOWN: "error.paymentUnknown", REFUND_OUTCOME_UNKNOWN: "error.refundUnknown",
  STRIPE_TEST_UNAVAILABLE: "error.stripe", AUTH_RATE_LIMITED: "error.rateLimit",
  AI_RATE_LIMITED: "error.rateLimit", RATE_LIMITED: "error.rateLimit"
};
const exact: Record<string, TranslationKey> = {
  "Your session changed. Please try again.": "error.session",
  "We could not connect. Please try again in a moment.": "error.network",
  "Choose a less common password": "error.passwordCommon",
  "Password must contain at least 15 characters": "error.passwordLength",
  "Password must be at most 72 UTF-8 bytes": "error.passwordBytes"
};
export function localizedError(locale: Locale, error: unknown): string {
  const value = typeof error === "object" && error !== null ? error as { message?: string; status?: number; problem?: { code?: string; detail?: string; locale?: string; errors?: { field: string; message: string }[] } } : {};
  const message = typeof error === "string" ? error : value.message ?? "";
  const code = value.problem?.code;
  if (code && codes[code]) return translate(locale, codes[code]);
  if (value.problem?.locale === locale && value.problem.detail) {
    return value.problem.errors?.length
      ? value.problem.errors.map((entry) => entry.message).join("; ")
      : value.problem.detail;
  }
  if (exact[message]) return translate(locale, exact[message]);
  if (/browser storage|guest cart could not be saved|session update could not be saved/i.test(message)) {
    return translate(locale, /secure sign-in/i.test(message) ? "error.secureSignIn" : "error.storage");
  }
  // Preserve existing English form/provider messages. German never silently displays an unknown English API detail.
  if (locale === "en" && message) return message;
  const status = value.status;
  const key = status === 401 ? "error.unauthorized" : status === 403 ? "error.forbidden" :
    status === 404 ? "error.notFound" : status === 409 ? "error.conflict" :
    status === 429 ? "error.rateLimit" : status === 400 || status === 422 ? "error.validation" :
    status === 503 ? "error.unavailable" : "error.generic";
  return translate(locale, key);
}
