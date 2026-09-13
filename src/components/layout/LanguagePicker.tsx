"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

export function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  return <select className="select languagePicker" aria-label={t("nav.language")} value={locale}
    onChange={(event) => setLocale(event.target.value === "de" ? "de" : "en")}>
    <option value="en" lang="en">EN</option>
    <option value="de" lang="de">DE</option>
  </select>;
}
