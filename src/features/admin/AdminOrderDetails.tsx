"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminApi, shippingApi } from "@/lib/api/shop";
import type { OrderStatus } from "@/lib/api/types";

const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  CREATED: ["PENDING_PAYMENT", "PAID", "CANCELLED"],
  PENDING_PAYMENT: ["PAID", "CREATED", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "COMPLETED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: []
};

const SHIPPING_STATUSES = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "READY_FOR_PICKUP", "PICKED_UP", "CANCELED"];

export function AdminOrderDetails({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const order = useQuery({ queryKey: ["admin-order", orderId], queryFn: () => adminApi.order(orderId) });
  const history = useQuery({ queryKey: ["admin-order-history", orderId], queryFn: () => adminApi.orderHistory(orderId) });
  const shipment = useQuery({
    queryKey: ["admin-shipment", orderId],
    queryFn: () => shippingApi.get(orderId),
    retry: false
  });

  const [shippingStatus, setShippingStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [refundPaymentId, setRefundPaymentId] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["admin-order-history", orderId] });
    queryClient.invalidateQueries({ queryKey: ["admin-shipment", orderId] });
  };

  const updateStatus = useMutation({
    mutationFn: (status: string) => adminApi.updateOrderStatus(orderId, status),
    onSuccess: invalidate
  });
  const updateShipping = useMutation({
    mutationFn: () => adminApi.updateShippingStatus(orderId, shippingStatus, trackingNumber || undefined),
    onSuccess: invalidate
  });
  const refund = useMutation({
    mutationFn: () => adminApi.refundPayment(Number(refundPaymentId)),
    onSuccess: invalidate
  });

  const data = order.data;
  const nextStatuses = data ? (NEXT_STATUSES[data.status] ?? []) : [];

  return (
    <AdminShell title={data ? `Order ${data.orderNumber}` : `Order #${orderId}`}>
      {order.error ? <p className="errorText">{(order.error as Error).message}</p> : null}
      {data ? (
        <div className="stack">
          <div className="card stack">
            <div className="toolbar">
              <StatusBadge value={data.status} />
              <span className="muted">{data.createdAt ? new Date(data.createdAt).toLocaleString() : ""}</span>
            </div>
            <p>
              Subtotal {Number(data.subtotalAmount).toFixed(2)} / shipping {Number(data.shippingAmount).toFixed(2)} /
              discount {Number(data.discountAmount).toFixed(2)}
              {data.promoCode ? ` (${data.promoCode})` : ""} / <strong>total {Number(data.paymentAmount).toFixed(2)} EUR</strong>
            </p>
            {nextStatuses.length ? (
              <div className="toolbar" style={{ flexWrap: "wrap" }}>
                <span className="muted">Move to:</span>
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    className="button"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">Terminal status - no transitions available.</p>
            )}
            {updateStatus.error ? <p className="errorText">{(updateStatus.error as Error).message}</p> : null}
          </div>

          <div className="card stack">
            <h2 className="subtitle" style={{ margin: 0 }}>
              Items
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>SKU</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>Brand</th>
                  <th>Qty</th>
                  <th>Total</th>
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
                      {item.quantity} x {Number(item.price).toFixed(2)}
                    </td>
                    <td>{Number(item.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="split">
            <div className="card stack">
              <h2 className="subtitle" style={{ margin: 0 }}>
                Shipping
              </h2>
              {shipment.data?.method ? (
                <p>
                  {shipment.data.method} / {shipment.data.shippingStatus}
                  {shipment.data.trackingNumber ? ` / ${shipment.data.trackingNumber}` : ""}
                </p>
              ) : (
                <p className="muted">Shipment not configured by the customer yet.</p>
              )}
              <div className="toolbar" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                <label className="label">
                  Status
                  <select className="select" value={shippingStatus} onChange={(e) => setShippingStatus(e.target.value)}>
                    <option value="">Select</option>
                    {SHIPPING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  Tracking number
                  <input className="input" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                </label>
                <button
                  className="button buttonDark"
                  disabled={!shippingStatus || updateShipping.isPending}
                  onClick={() => updateShipping.mutate()}
                >
                  Update shipping
                </button>
              </div>
              {updateShipping.error ? <p className="errorText">{(updateShipping.error as Error).message}</p> : null}
            </div>

            <div className="card stack">
              <h2 className="subtitle" style={{ margin: 0 }}>
                Refund
              </h2>
              <p className="muted">
                Refunds go through the payment provider, mark the order REFUNDED and return goods to stock. Enter the
                payment id (visible to the customer on the payment page).
              </p>
              <div className="toolbar" style={{ alignItems: "flex-end" }}>
                <label className="label">
                  Payment id
                  <input
                    className="input"
                    type="number"
                    value={refundPaymentId}
                    onChange={(e) => setRefundPaymentId(e.target.value)}
                    style={{ width: 120 }}
                  />
                </label>
                <button
                  className="button buttonRed"
                  disabled={!refundPaymentId || refund.isPending}
                  onClick={() => refund.mutate()}
                >
                  Refund payment
                </button>
              </div>
              {refund.isSuccess ? <p className="status statusOk">refund executed</p> : null}
              {refund.error ? <p className="errorText">{(refund.error as Error).message}</p> : null}
            </div>
          </div>

          <div className="card stack">
            <h2 className="subtitle" style={{ margin: 0 }}>
              Status history
            </h2>
            {!history.data?.length ? <p className="muted">No history entries.</p> : null}
            {history.data?.map((entry, index) => (
              <p key={index} className="muted">
                {new Date(entry.createdAt).toLocaleString()}: {entry.fromStatus ?? "-"} → <strong>{entry.toStatus}</strong>{" "}
                by {entry.changedBy}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
