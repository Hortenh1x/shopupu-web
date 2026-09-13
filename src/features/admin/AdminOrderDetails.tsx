"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminRefundPanel } from "@/features/admin/AdminRefundPanel";
import { AdminShell } from "@/features/admin/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminApi, shippingApi } from "@/lib/api/shop";
import type { OrderStatus } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  CREATED: ["CANCELLED"],
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED", "COMPLETED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: []
};

const SHIPPING_STATUSES = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELED"];

export function AdminOrderDetails({ orderId }: { orderId: number }) {
  const { t, errorMessage, formatPrice, formatDate, statusLabel, shippingLabel } = useI18n();
  const queryClient = useQueryClient();
  const order = useSessionQuery({ queryKey: ["admin-order", orderId], queryFn: () => adminApi.order(orderId) });
  const history = useSessionQuery({ queryKey: ["admin-order-history", orderId], queryFn: () => adminApi.orderHistory(orderId) });
  const shipment = useSessionQuery({
    queryKey: ["admin-shipment", orderId],
    queryFn: () => shippingApi.get(orderId),
    retry: false
  });

  const [shippingStatus, setShippingStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["admin-order-history", orderId] });
    queryClient.invalidateQueries({ queryKey: ["admin-shipment", orderId] });
  };

  const updateStatus = useSessionMutation({
    mutationFn: (status: string) => adminApi.updateOrderStatus(orderId, status),
    onSuccess: invalidate
  });
  const updateShipping = useSessionMutation({
    mutationFn: () => adminApi.updateShippingStatus(orderId, shippingStatus, trackingNumber || undefined),
    onSuccess: invalidate
  });

  const data = order.data;
  const nextStatuses = data ? (NEXT_STATUSES[data.status] ?? []) : [];

  return (
    <AdminShell title={data ? t("admin.orderTitle", { number: data.orderNumber }) : t("admin.orderIdTitle", { id: orderId })}>
      {order.error ? <p className="errorText">{errorMessage(order.error)}</p> : null}
      {data ? (
        <div className="stack">
          <div className="card stack">
            <div className="toolbar">
              <StatusBadge value={data.status} />
              <span className="muted">{data.createdAt ? formatDate(data.createdAt) : ""}</span>
            </div>
            <p>
              {t("admin.subtotal")} {formatPrice(data.subtotalAmount)} / {t("admin.shippingCost")} {formatPrice(data.shippingAmount)} /{" "}
              {t("admin.discountLabel")} {formatPrice(data.discountAmount)}
              {data.promoCode ? ` (${data.promoCode})` : ""} / <strong>{t("admin.totalLabel")} {formatPrice(data.paymentAmount)}</strong>
            </p>
            {nextStatuses.length ? (
              <div className="toolbar" style={{ flexWrap: "wrap" }}>
                <span className="muted">{t("admin.moveTo")}</span>
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    className="button"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(status)}
                  >
                    {statusLabel(status)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">{t("admin.noTransitions")}</p>
            )}
            {updateStatus.error ? <p className="errorText">{errorMessage(updateStatus.error)}</p> : null}
          </div>

          <div className="card stack">
            <h2 className="subtitle" style={{ margin: 0 }}>
              {t("admin.items")}
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("admin.field.title")}</th>
                  <th>{t("admin.sku")}</th>
                  <th>{t("admin.size")}</th>
                  <th>{t("admin.color")}</th>
                  <th>{t("admin.brand")}</th>
                  <th>{t("admin.qty")}</th>
                  <th>{t("admin.total")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td className="muted">{item.sku ?? "-"}</td>
                    <td>{item.size ?? "-"}</td>
                    <td>{item.color ?? "-"}</td>
                    <td>{item.brand ?? "-"}</td>
                    <td>
                      {item.quantity} x {formatPrice(item.price)}
                    </td>
                    <td>{formatPrice(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="split">
            <div className="card stack">
              <h2 className="subtitle" style={{ margin: 0 }}>
                {t("admin.shipping")}
              </h2>
              {shipment.data?.method ? (
                <p>
                  {shippingLabel(shipment.data.method)} / {statusLabel(shipment.data.shippingStatus ?? "PENDING")}
                  {shipment.data.trackingNumber ? ` / ${shipment.data.trackingNumber}` : ""}
                </p>
              ) : (
                <p className="muted">{t("admin.shipmentNotConfigured")}</p>
              )}
              <div className="toolbar" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                <label className="label">
                  {t("admin.status")}
                  <select className="select" value={shippingStatus} onChange={(e) => setShippingStatus(e.target.value)}>
                    <option value="">{t("admin.select")}</option>
                    {SHIPPING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  {t("admin.trackingNumber")}
                  <input className="input" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                </label>
                <button
                  className="button buttonDark"
                  disabled={!shippingStatus || updateShipping.isPending}
                  onClick={() => updateShipping.mutate()}
                >
                  {t("admin.updateShipping")}
                </button>
              </div>
              {updateShipping.error ? <p className="errorText">{errorMessage(updateShipping.error)}</p> : null}
            </div>

            <AdminRefundPanel orderId={orderId} />
          </div>

          <div className="card stack">
            <h2 className="subtitle" style={{ margin: 0 }}>
              {t("admin.statusHistory")}
            </h2>
            {!history.data?.length ? <p className="muted">{t("admin.noHistory")}</p> : null}
            {history.data?.map((entry, index) => (
              <p key={index} className="muted">
                {formatDate(entry.createdAt)}: {entry.fromStatus ? statusLabel(entry.fromStatus) : "-"} →{" "}
                <strong>{statusLabel(entry.toStatus)}</strong> {t("admin.by")} {entry.changedBy}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
