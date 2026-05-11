"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export function AdminOrderDetails({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const order = useQuery({ queryKey: ["admin-order", orderId], queryFn: () => adminApi.order(orderId) });
  const update = useMutation({
    mutationFn: (status: string) => adminApi.updateOrderStatus(orderId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] })
  });
  return (
    <AdminShell title={`Order #${orderId}`}>
      <div className="card stack">
        <span className="status">{order.data?.status}</span>
        <p>Total: {Number(order.data?.paymentAmount ?? 0).toFixed(2)} EUR</p>
        <div className="toolbar">
          {["NEW", "READY_FOR_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELED"].map((status) => (
            <button key={status} className="button" onClick={() => update.mutate(status)}>{status}</button>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
