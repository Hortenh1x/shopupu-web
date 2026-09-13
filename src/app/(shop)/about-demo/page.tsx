"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export default function Page() {
  const { t } = useI18n();
  return <main className="page stack" style={{ maxWidth: 820, gap: 24 }}>
    <h1 className="title">{t("about.title")}</h1>
    <section className="stack">
      <h2 className="subtitle">{t("about.productsTitle")}</h2>
      <p>{t("about.products")}</p>
      <p>{t("about.reviews")}</p>
    </section>
    <section className="stack">
      <h2 className="subtitle">{t("about.paymentTitle")}</h2>
      <p>{t("about.payment")}</p>
      <p>{t("about.noCards")}</p>
    </section>
    <section className="stack">
      <h2 className="subtitle">{t("about.contactTitle")}</h2>
      <p>{t("about.contact")}</p>
      <p>{t("about.email")}</p>
    </section>
    <Link className="button" href="/privacy">{t("nav.privacy")}</Link>
    <Link className="button buttonDark" href="/catalog">{t("about.explore")}</Link>
  </main>;
}
