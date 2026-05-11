"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { orderApi, shippingApi } from "@/lib/api/shop";

export function OrderDetailsPage({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const order = useQuery({ queryKey: ["order", orderId], queryFn: () => orderApi.get(orderId) });
  const shipment = useQuery({ queryKey: ["shipment", orderId], queryFn: () => shippingApi.get(orderId), retry: false });
  const cancel = useMutation({
    mutationFn: () => orderApi.cancel(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order", orderId] })
  });

  if (order.isLoading) return <EmptyState title="Loading order" />;
  if (!order.data) return <EmptyState title="Order not found" />;

  return (
    <Protected>
      <main className="page">
        <section className="split">
          <div className="stack">
            <h1 className="title">Order #{order.data.id}</h1>
            <table className="table">
              <tbody>
                {order.data.items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.title}</td>
                    <td>{item.quantity} x {Number(item.unitPrice).toFixed(2)} EUR</td>
                    <td>{Number(item.lineTotal).toFixed(2)} EUR</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="card stack">
            <span className="status">{order.data.status}</span>
            <p>Subtotal: {Number(order.data.subtotalAmount).toFixed(2)} EUR</p>
            <p>Shipping: {Number(order.data.shippingAmount).toFixed(2)} EUR</p>
            <strong>Total: {Number(order.data.paymentAmount).toFixed(2)} EUR</strong>
            {shipment.data ? <p>Shipping: {shipment.data.method} / {shipment.data.shippingStatus}</p> : null}
            <Link className="button buttonDark" href={`/checkout/payment?orderId=${order.data.id}`}>Pay</Link>
            <button className="button buttonRed" onClick={() => cancel.mutate()}>Cancel</button>
          </aside>
        </section>
      </main>
    </Protected>
  );
}
