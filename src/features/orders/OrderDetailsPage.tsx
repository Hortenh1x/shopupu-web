"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatPrice } from "@/features/catalog/ProductCard";
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

  if (order.isLoading) {
    return (
      <main className="page">
        <Skeleton lines={5} />
      </main>
    );
  }

  if (!order.data) {
    return (
      <main className="page">
        <EmptyState title="Order not found" body="It may belong to another account.">
          <Link className="button buttonDark" href="/orders">
            Back to orders
          </Link>
        </EmptyState>
      </main>
    );
  }

  const data = order.data;

  return (
    <Protected>
      <main className="page">
        <section className="split">
          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 6 }}>
              <span className="kicker">Order</span>
              <h1 className="title mono" style={{ letterSpacing: "-0.01em" }}>
                {data.orderNumber}
              </h1>
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                Placed {data.createdAt ? new Date(data.createdAt).toLocaleString() : "-"}
                {data.updatedAt ? ` · updated ${new Date(data.updatedAt).toLocaleString()}` : ""}
              </p>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="stack" style={{ gap: 3 }}>
                        <Link href={`/products/${item.productId}`} style={{ fontWeight: 600 }}>
                          {item.title}
                        </Link>
                        <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                          {[item.brand, item.size, item.color, item.sku].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </td>
                    <td className="mono">{item.quantity}</td>
                    <td className="price">{formatPrice(item.price)}</td>
                    <td className="price">{formatPrice(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="card stack" style={{ gap: 10 }}>
              <h2 className="subtitle" style={{ margin: 0 }}>
                Shipping.
              </h2>
              {shipment.data?.method ? (
                <>
                  <div className="toolbar" style={{ gap: 10 }}>
                    <StatusBadge value={shipment.data.shippingStatus ?? "PENDING"} />
                    <span className="muted">{shipment.data.method.replaceAll("_", " ").toLowerCase()}</span>
                    {shipment.data.trackingNumber ? (
                      <span className="mono" style={{ fontSize: "0.85rem" }}>
                        tracking: {shipment.data.trackingNumber}
                      </span>
                    ) : null}
                  </div>
                  {shipment.data.address?.line1 ? (
                    <p className="muted" style={{ margin: 0 }}>
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
                <p className="muted" style={{ margin: 0 }}>
                  Shipping is not configured yet.
                </p>
              )}
            </div>
          </div>

          <aside className="card stack" style={{ position: "sticky", top: 84, padding: 24, gap: 12 }}>
            <StatusBadge value={data.status} />
            <div className="stack" style={{ gap: 8 }}>
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span className="muted">Subtotal</span>
                <span className="price">{formatPrice(data.subtotalAmount)}</span>
              </div>
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span className="muted">Shipping</span>
                <span className="price">{formatPrice(data.shippingAmount)}</span>
              </div>
              {data.discountAmount > 0 ? (
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Discount{data.promoCode ? ` (${data.promoCode})` : ""}</span>
                  <span className="price">&minus;{formatPrice(data.discountAmount)}</span>
                </div>
              ) : null}
              <hr className="divider" />
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Total</span>
                <span className="price" style={{ fontSize: "1.6rem" }}>
                  {formatPrice(data.paymentAmount)}
                </span>
              </div>
            </div>
            {PAYABLE.has(data.status) ? (
              <Link className="button buttonDark" href={`/checkout/shipping?orderId=${data.id}`}>
                {data.shippingAmount > 0 || shipment.data?.method ? "Continue to payment" : "Set up shipping & pay"}
              </Link>
            ) : null}
            {CANCELLABLE.has(data.status) ? (
              <button className="button buttonRed" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                {cancel.isPending ? "Cancelling..." : "Cancel order"}
              </button>
            ) : null}
            {cancel.error ? <p className="errorText" style={{ margin: 0 }}>{(cancel.error as Error).message}</p> : null}
          </aside>
        </section>
      </main>
    </Protected>
  );
}
