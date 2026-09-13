"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useRouter, useSearchParams } from "next/navigation";

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  function go(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage + 1));
    router.push(`?${next.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <nav className="toolbar" style={{ justifyContent: "center", marginTop: 28 }} aria-label={t("common.pagination")}>
      <button className="button buttonSmall" disabled={page <= 0} onClick={() => go(page - 1)}>
        {t("common.previous")}
      </button>
      <span className="mono muted" style={{ fontSize: "0.88rem", padding: "0 6px" }}>
        {t("common.page", { page: page + 1, pages: totalPages })}
      </span>
      <button className="button buttonSmall" disabled={page >= totalPages - 1} onClick={() => go(page + 1)}>
        {t("common.next")}
      </button>
    </nav>
  );
}
