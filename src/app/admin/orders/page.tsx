"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: adminApi.orders });
  return (
    <AdminShell title="Orders">
      <table className="table">
        <thead><tr><th>ID</th><th>Status</th><th>Total</th><th /></tr></thead>
        <tbody>
          {orders.data?.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td><span className="status">{order.status}</span></td>
              <td>{Number(order.paymentAmount).toFixed(2)} EUR</td>
              <td><Link className="button" href={`/admin/orders/${order.id}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
