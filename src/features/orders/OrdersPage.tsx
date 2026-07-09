"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatPrice } from "@/features/catalog/ProductCard";
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
        <div className="toolbar" style={{ marginBottom: 24 }}>
          <h1 className="title" style={{ marginRight: "auto" }}>
            Orders.
          </h1>
          <label className="label">
            Status
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.toLowerCase().replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        {orders.error ? <p className="errorText">{(orders.error as Error).message}</p> : null}
        {orders.isLoading ? (
          <Skeleton lines={5} />
        ) : !orders.data?.content?.length ? (
          <EmptyState title="No orders yet." body="Check out from the cart to place your first order.">
            <Link className="button buttonDark" href="/catalog">
              Browse the catalog
            </Link>
          </EmptyState>
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
                  <th aria-label="Actions" />
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
                    <td className="muted">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "–"}</td>
                    <td>
                      <Link className="button buttonSmall" href={`/orders/${order.id}`}>
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
