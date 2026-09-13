"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";

export function DemoNotice() {
  const { t } = useI18n();
  return <aside className="demoNotice" aria-label={t("demo.noticeLabel")}>
    <div className="demoNoticeInner">
      <strong>{t("demo.title")}</strong>
      <span>{t("demo.notice")}</span>
      <Link href="/about-demo">{t("demo.how")}</Link>
    </div>
  </aside>;
}
