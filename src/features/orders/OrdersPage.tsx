"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { orderApi } from "@/lib/api/shop";

export function OrdersPage() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: orderApi.list });

  return (
    <Protected>
      <main className="page">
        <h1 className="title">Orders</h1>
        {!orders.data?.length ? (
          <EmptyState title="No orders" body="Checkout from cart to create your first order." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td><span className="status">{order.status}</span></td>
                  <td>{Number(order.paymentAmount).toFixed(2)} EUR</td>
                  <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
                  <td><Link className="button" href={`/orders/${order.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </Protected>
  );
}
