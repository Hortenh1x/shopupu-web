"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("PROCESSING");
  const [trackingNumber, setTrackingNumber] = useState("");
  const update = useMutation({
    mutationFn: () => adminApi.updateShippingStatus(Number(orderId), status, trackingNumber || undefined)
  });

  return (
    <AdminShell title="Shipping">
      <form className="card stack" onSubmit={(event) => { event.preventDefault(); update.mutate(); }}>
        <div className="toolbar">
          <label className="label">Order ID<input className="input" value={orderId} onChange={(event) => setOrderId(event.target.value)} /></label>
          <label className="label">
            Status
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </label>
          <label className="label">Tracking<input className="input" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /></label>
        </div>
        <button className="button buttonDark">Update shipment</button>
        {update.data ? <span className="status">Updated</span> : null}
        {update.error ? <p className="muted">{update.error.message}</p> : null}
      </form>
    </AdminShell>
  );
}
