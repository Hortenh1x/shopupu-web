import { cookies } from "next/headers";
import { localeCookieName, parseLocale, translate, type TranslationParams } from "./core";
import type { TranslationKey } from "./messages";

export async function getServerI18n() {
  const locale = parseLocale((await cookies()).get(localeCookieName)?.value);
  return { locale, t: (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params) };
}
