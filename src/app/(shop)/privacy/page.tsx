"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { OPERATOR } from "@/lib/operator";

export default function Page() {
  const { t } = useI18n();
  return <main className="page stack" style={{ maxWidth: 820, gap: 24 }}>
    <h1 className="title">{t("privacy.title")}</h1>
    <section className="stack">
      <h2 className="subtitle">{t("privacy.storesTitle")}</h2>
      <p>{t("privacy.stores")}</p>
      <p>{t("privacy.browser")}</p>
    </section>
    <section className="stack">
      <h2 className="subtitle">{t("privacy.externalTitle")}</h2>
      <p>{t("privacy.external")}</p>
    </section>
    <section className="stack">
      <h2 className="subtitle">{t("privacy.manageTitle")}</h2>
      <p>{t("privacy.manage")}</p>
      <p>{t("privacy.export")}</p>
    </section>
    <section className="stack">
      <h2 className="subtitle">{t("privacy.retentionTitle")}</h2>
      <p>{t("privacy.retention")}</p>
    </section>
    <Link className="button buttonDark" href="/profile">{t("privacy.settings")}</Link>
    <p className="muted">
      {t("privacy.operator")}{" "}
      <strong>{t("privacy.operatorLabel")}:</strong> {OPERATOR.name} ·{" "}
      <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
    </p>
    <Link href="/about-demo">{t("nav.about")}</Link>
  </main>;
}
