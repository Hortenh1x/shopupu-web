"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

const SHIPPING_STATUSES = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELED"];

export default function Page() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("PREPARING");
  const [trackingNumber, setTrackingNumber] = useState("");
  const update = useMutation({
    mutationFn: () => adminApi.updateShippingStatus(Number(orderId), status, trackingNumber || undefined)
  });

  return (
    <AdminShell title="Shipping">
      <p className="muted">Quick shipment update by order id (also available on each order page).</p>
      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate();
        }}
      >
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label">
            Order ID
            <input className="input" required value={orderId} onChange={(event) => setOrderId(event.target.value)} />
          </label>
          <label className="label">
            Status
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              {SHIPPING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Tracking
            <input className="input" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
          </label>
        </div>
        <button className="button buttonDark" disabled={update.isPending}>
          Update shipment
        </button>
        {update.data ? <span className="status">Updated</span> : null}
        {update.error ? <p className="muted">{(update.error as Error).message}</p> : null}
      </form>
    </AdminShell>
  );
}
