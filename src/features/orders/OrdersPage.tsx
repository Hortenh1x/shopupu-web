"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
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
  const searchParams = useSearchParams();
  const page = Math.max(Number(searchParams.get("page") ?? "1") - 1, 0);
  const [status, setStatus] = useState("");
  const orders = useQuery({
    queryKey: ["orders", page, status],
    queryFn: () => orderApi.list(page, 10, status || undefined)
  });

  return (
    <Protected>
      <main className="page">
        <div className="toolbar">
          <h1 className="title" style={{ marginRight: "auto" }}>
            Orders
          </h1>
          <label className="label">
            Status
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {orders.error ? <p className="muted">{(orders.error as Error).message}</p> : null}
        {!orders.data?.content?.length ? (
          <EmptyState title="No orders" body="Checkout from cart to create your first order." />
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Discount</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.data.content.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>
                      <span className="status">{order.status}</span>
                    </td>
                    <td>{Number(order.paymentAmount).toFixed(2)} EUR</td>
                    <td>
                      {order.discountAmount > 0
                        ? `-${Number(order.discountAmount).toFixed(2)}${order.promoCode ? ` (${order.promoCode})` : ""}`
                        : "-"}
                    </td>
                    <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
                    <td>
                      <Link className="button" href={`/orders/${order.id}`}>
                        Open
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
