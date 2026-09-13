"use client";

import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const SHIPPING_STATUSES = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELED"];

export default function Page() {
  const { t, errorMessage, statusLabel } = useI18n();
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("PREPARING");
  const [trackingNumber, setTrackingNumber] = useState("");
  const update = useSessionMutation({
    mutationFn: () => adminApi.updateShippingStatus(Number(orderId), status, trackingNumber || undefined)
  });

  return (
    <AdminShell title={t("admin.shipping")}>
      <p className="muted">{t("admin.shippingHint")}</p>
      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate();
        }}
      >
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label">
            {t("admin.orderId")}
            <input className="input" required value={orderId} onChange={(event) => setOrderId(event.target.value)} />
          </label>
          <label className="label">
            {t("admin.status")}
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              {SHIPPING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            {t("admin.tracking")}
            <input className="input" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
          </label>
        </div>
        <button className="button buttonDark" disabled={update.isPending}>
          {t("admin.updateShipment")}
        </button>
        {update.data ? <span className="status statusOk">{t("admin.updated")}</span> : null}
        {update.error ? <p className="errorText">{errorMessage(update.error)}</p> : null}
      </form>
    </AdminShell>
  );
}
