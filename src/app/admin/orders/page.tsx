"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import Link from "next/link";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminApi } from "@/lib/api/shop";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const STATUSES = [
  "CREATED",
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED"
];

export default function Page() {
  const { t, errorMessage, formatPrice, formatDate, statusLabel } = useI18n();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const orders = useSessionQuery({
    queryKey: ["admin-orders", page, status],
    queryFn: () => adminApi.orders(page, 20, status || undefined)
  });

  const data = orders.data;

  return (
    <AdminShell title={t("admin.nav.orders")}>
      <div className="card toolbar">
        <label className="label">
          {t("admin.status")}
          <select
            className="select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="">{t("admin.all")}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {orders.error ? <p className="errorText">{errorMessage(orders.error)}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>{t("admin.order")}</th>
            <th>{t("admin.status")}</th>
            <th>{t("admin.total")}</th>
            <th>{t("admin.discount")}</th>
            <th>{t("admin.created")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.content?.map((order) => (
            <tr key={order.id}>
              <td className="mono" style={{ fontWeight: 600 }}>{order.orderNumber}</td>
              <td>
                <StatusBadge value={order.status} />
              </td>
              <td className="price">{formatPrice(order.paymentAmount)}</td>
              <td className="mono muted">{order.discountAmount > 0 ? `-${formatPrice(order.discountAmount)}` : "-"}</td>
              <td>{order.createdAt ? formatDate(order.createdAt) : "-"}</td>
              <td>
                <Link className="button buttonSmall" href={`/admin/orders/${order.id}`}>
                  {t("admin.open")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {t("common.previous")}
          </button>
          <span className="mono muted" style={{ fontSize: "0.88rem" }}>
            {t("common.page", { page: page + 1, pages: data.totalPages })}
          </span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            {t("common.next")}
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
