"use client";

import Link from "next/link";
import { ADMIN_NAV, AdminShell } from "@/features/admin/AdminShell";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export default function Page() {
  const { t } = useI18n();
  return (
    <AdminShell title={t("admin.title")}>
      <div className="card" style={{ padding: "4px 24px" }}>
        {ADMIN_NAV.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="toolbar"
            style={{
              justifyContent: "space-between",
              padding: "16px 0",
              borderTop: index > 0 ? "1px solid var(--line)" : undefined
            }}
          >
            <span className="stack" style={{ gap: 4 }}>
              <span style={{ fontWeight: 650, fontFamily: "var(--font-head)", fontSize: "1.05rem" }}>
                {t(item.href === "/admin/ai" ? "admin.nav.aiMaintenance" : item.label)}
              </span>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                {t(item.note)}
              </span>
            </span>
            <span aria-hidden="true" className="mono muted">
              &rarr;
            </span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
