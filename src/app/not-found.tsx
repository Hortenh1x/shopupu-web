"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";

export default function NotFound() {
  const { t } = useI18n();
  return <main className="page stack" style={{ gap: 20 }}>
    <span className="kicker">404</span>
    <h1 className="title">{t("page.notFoundTitle")}</h1>
    <p>{t("page.notFoundBody")}</p>
    <Link className="button buttonDark" href="/catalog">{t("nav.backCatalog")}</Link>
  </main>;
}
