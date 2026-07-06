"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { orderApi, shippingApi } from "@/lib/api/shop";

const CANCELLABLE = new Set(["CREATED", "PENDING_PAYMENT"]);
const PAYABLE = new Set(["CREATED", "PENDING_PAYMENT"]);

export function OrderDetailsPage({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const order = useQuery({ queryKey: ["order", orderId], queryFn: () => orderApi.get(orderId) });
  const shipment = useQuery({
    queryKey: ["shipment", orderId],
    queryFn: () => shippingApi.get(orderId),
    retry: false
  });
  const cancel = useMutation({
    mutationFn: () => orderApi.cancel(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order", orderId] })
  });

  if (order.isLoading) return <EmptyState title="Loading order" />;
  if (!order.data) return <EmptyState title="Order not found" />;

  const data = order.data;

  return (
    <Protected>
      <main className="page">
        <section className="split">
          <div className="stack">
            <h1 className="title">{data.orderNumber}</h1>
            <p className="muted">
              Created {data.createdAt ? new Date(data.createdAt).toLocaleString() : "-"}
              {data.updatedAt ? ` / updated ${new Date(data.updatedAt).toLocaleString()}` : ""}
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
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
                    <td>
                      <Link href={`/products/${item.productId}`}>{item.title}</Link>
                    </td>
                    <td className="muted">{item.sku ?? "-"}</td>
                    <td>{item.size ?? "-"}</td>
                    <td>{item.color ?? "-"}</td>
                    <td>{item.brand ?? "-"}</td>
                    <td>
                      {item.quantity} x {Number(item.price).toFixed(2)}
                    </td>
                    <td>{Number(item.lineTotal).toFixed(2)} EUR</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="card stack">
              <h2 className="subhead" style={{ margin: 0 }}>
                Shipping
              </h2>
              {shipment.data?.method ? (
                <>
                  <p>
                    {shipment.data.method} / {shipment.data.shippingStatus ?? "PENDING"}
                    {shipment.data.trackingNumber ? ` / tracking: ${shipment.data.trackingNumber}` : ""}
                  </p>
                  {shipment.data.address?.line1 ? (
                    <p className="muted">
                      {[
                        shipment.data.address.fullName,
                        shipment.data.address.line1,
                        shipment.data.address.line2,
                        shipment.data.address.city,
                        shipment.data.address.postalCode,
                        shipment.data.address.country
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="muted">Shipping is not configured yet.</p>
              )}
            </div>
          </div>

          <aside className="card stack" style={{ position: "sticky", top: 92 }}>
            <span className="status">{data.status}</span>
            <p>Subtotal: {Number(data.subtotalAmount).toFixed(2)} EUR</p>
            <p>Shipping: {Number(data.shippingAmount).toFixed(2)} EUR</p>
            {data.discountAmount > 0 ? (
              <p>
                Discount: -{Number(data.discountAmount).toFixed(2)} EUR
                {data.promoCode ? ` (${data.promoCode})` : ""}
              </p>
            ) : null}
            <strong style={{ fontSize: "1.6rem" }}>Total: {Number(data.paymentAmount).toFixed(2)} EUR</strong>
            {PAYABLE.has(data.status) ? (
              <Link className="button buttonDark" href={`/checkout/shipping?orderId=${data.id}`}>
                {data.shippingAmount > 0 || shipment.data?.method ? "Continue to payment" : "Set up shipping & pay"}
              </Link>
            ) : null}
            {CANCELLABLE.has(data.status) ? (
              <button className="button buttonRed" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                Cancel order
              </button>
            ) : null}
            {cancel.error ? <p className="muted">{(cancel.error as Error).message}</p> : null}
          </aside>
        </section>
      </main>
    </Protected>
  );
}
