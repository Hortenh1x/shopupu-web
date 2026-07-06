"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

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
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const orders = useQuery({
    queryKey: ["admin-orders", page, status],
    queryFn: () => adminApi.orders(page, 20, status || undefined)
  });

  const data = orders.data;

  return (
    <AdminShell title="Orders">
      <div className="card toolbar">
        <label className="label">
          Status
          <select
            className="select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
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
          {data?.content?.map((order) => (
            <tr key={order.id}>
              <td>{order.orderNumber}</td>
              <td>
                <span className="status">{order.status}</span>
              </td>
              <td>{Number(order.paymentAmount).toFixed(2)} EUR</td>
              <td>{order.discountAmount > 0 ? `-${Number(order.discountAmount).toFixed(2)}` : "-"}</td>
              <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
              <td>
                <Link className="button" href={`/admin/orders/${order.id}`}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="status">
            {page + 1} / {data.totalPages}
          </span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
