"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return <main className="page stack" style={{ gap: 20 }}>
    <h1 className="title">{t("page.errorTitle")}</h1>
    <p>{t("page.errorBody")}</p>
    <div className="toolbar">
      <button className="button buttonDark" onClick={reset}>{t("common.retry")}</button>
      <Link className="button" href="/catalog">{t("nav.backCatalog")}</Link>
    </div>
  </main>;
}
