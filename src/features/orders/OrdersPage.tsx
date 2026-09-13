"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { orderApi } from "@/lib/api/shop";

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

export function OrdersPage() {
  const { t, errorMessage, formatPrice, formatDate, statusLabel } = useI18n();
  const searchParams = useSearchParams();
  const page = Math.max(Number(searchParams.get("page") ?? "1") - 1, 0);
  const [status, setStatus] = useState("");
  const orders = useSessionQuery({
    queryKey: ["orders", page, status],
    queryFn: () => orderApi.list(page, 10, status || undefined)
  });

  return (
    <Protected>
      <main className="page">
        <div className="toolbar" style={{ marginBottom: 24 }}>
          <h1 className="title" style={{ marginRight: "auto" }}>
            {t("commerce.ordersTitle")}
          </h1>
          <label className="label">
            {t("commerce.status")}
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">{t("commerce.all")}</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {orders.error ? <p className="errorText">{errorMessage(orders.error)}</p> : null}
        {orders.isLoading ? (
          <Skeleton lines={5} />
        ) : !orders.data?.content?.length ? (
          <EmptyState title={t("commerce.noOrders")} body={t("commerce.placeFirst")}>
            <Link className="button buttonDark" href="/catalog">
              {t("commerce.browse")}
            </Link>
          </EmptyState>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("commerce.order")}</th>
                  <th>{t("commerce.status")}</th>
                  <th>{t("commerce.total")}</th>
                  <th>{t("commerce.discount")}</th>
                  <th>{t("commerce.created")}</th>
                  <th aria-label={t("common.actions")} />
                </tr>
              </thead>
              <tbody>
                {orders.data.content.map((order) => (
                  <tr key={order.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {order.orderNumber}
                    </td>
                    <td>
                      <StatusBadge value={order.status} />
                    </td>
                    <td className="price">{formatPrice(order.paymentAmount)}</td>
                    <td className="mono muted">
                      {order.discountAmount > 0
                        ? `-${formatPrice(order.discountAmount)}${order.promoCode ? ` (${order.promoCode})` : ""}`
                        : "–"}
                    </td>
                    <td className="muted">{order.createdAt ? formatDate(order.createdAt, { dateStyle: "medium" }) : "–"}</td>
                    <td>
                      <Link className="button buttonSmall" href={`/orders/${order.id}`}>
                        {t("commerce.open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={orders.data.number} totalPages={orders.data.totalPages} />
          </>
        )}
      </main>
    </Protected>
  );
}
