"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";
import { Spark } from "@/components/layout/SiteHeader";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="siteFooter">
      <div className="footerInner">
        <div className="footerCols">
          <div className="stack" style={{ gap: 12, alignContent: "start" }}>
            <span className="wordmark" style={{ color: "inherit" }}>
              <Spark />
              shopupu
            </span>
            <p className="muted" style={{ margin: 0, maxWidth: "38ch" }}>
              {t("footer.description")}
            </p>
          </div>
          <nav aria-label={t("nav.shop")}>
            <span className="kicker onDark">{t("nav.shop")}</span>
            <Link href="/catalog">{t("nav.catalog")}</Link>
            <Link href="/cart">{t("nav.cart")}</Link>
            <Link href="/orders">{t("nav.orders")}</Link>
          </nav>
          <nav aria-label={t("nav.account")}>
            <span className="kicker onDark">{t("nav.account")}</span>
            <Link href="/profile">{t("nav.profile")}</Link>
            <Link href="/login">{t("nav.signIn")}</Link>
            <Link href="/register">{t("nav.register")}</Link>
          </nav>
          <nav aria-label={t("nav.project")}>
            <span className="kicker onDark">{t("nav.project")}</span>
            <Link href="/about-demo">{t("nav.about")}</Link>
            <Link href="/privacy">{t("nav.privacy")}</Link>
            <a href="https://github.com/Hortenh1x/shopupu" target="_blank" rel="noreferrer">
              {t("footer.backend")}
            </a>
            <a href="https://github.com/Hortenh1x/shopupu-web" target="_blank" rel="noreferrer">
              {t("footer.frontend")}
            </a>
            <a
              href="https://www.upwork.com/freelancers/~0109d61646060009e4?mp_source=share"
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.hire")}
            </a>
          </nav>
        </div>
        <div className="footerBase">
          <span>&copy; 2026 shopupu</span>
          <span>{t("footer.fonts")}</span>
        </div>
      </div>
    </footer>
  );
}
