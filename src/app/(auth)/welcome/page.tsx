"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/shop";

export default function WelcomePage() {
  const { t } = useI18n();
  const config = useQuery({ queryKey: ["storefront-config"], queryFn: storefrontApi.config });
  return <main className="page">
    <section className="brutal stack" style={{ maxWidth: 520, margin: "40px auto", padding: "40px 32px", gap: 12 }}>
      <h1 className="title">{t("auth.accountReady")}</h1>
      <p className="subhead">{t("auth.exploreDemo")}</p>
      <p className="muted">{t("auth.fictionalProducts")}</p>
      {config.data?.email.available === false ? <p className="muted">{t("auth.welcomeNoMail")}</p> :
        config.data?.email.available ? <p className="muted">{t("auth.verificationRequested")}</p> : null}
      <div className="toolbar">
        <Link className="button buttonDark" href="/catalog">{t("auth.goCatalog")}</Link>
        <Link className="button" href="/profile">{t("profile.myAccount")}</Link>
      </div>
    </section>
  </main>;
}
