"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export default function Page() {
  const { t, errorMessage, roleLabel } = useI18n();
  const [page, setPage] = useState(0);
  const users = useSessionQuery({ queryKey: ["admin-users", page], queryFn: () => adminApi.users(page) });
  const data = users.data;

  return (
    <AdminShell title={t("admin.nav.users")}>
      {users.error ? <p className="errorText">{errorMessage(users.error)}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>{t("admin.id")}</th>
            <th>{t("admin.email")}</th>
            <th>{t("admin.name")}</th>
            <th>{t("admin.roles")}</th>
            <th>{t("admin.status")}</th>
            <th>{t("admin.emailVerified")}</th>
          </tr>
        </thead>
        <tbody>
          {data?.content?.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "-"}</td>
              <td>{user.roles?.map(roleLabel).join(", ")}</td>
              <td>{user.enabled ? t("common.enabled") : t("common.disabled")}</td>
              <td>{user.emailVerified ? t("common.yes") : t("common.no")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {t("common.previous")}
          </button>
          <span className="mono muted" style={{ fontSize: "0.88rem" }}>{t("common.page", { page: page + 1, pages: data.totalPages })}</span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            {t("common.next")}
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
