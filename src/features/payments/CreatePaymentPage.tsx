"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/features/catalog/ProductCard";
import { newIdempotencyKey } from "@/lib/api/client";
import { orderApi, paymentApi } from "@/lib/api/shop";
import { isSafeHttpUrl } from "@/lib/url";

export function CreatePaymentPage() {
  const params = useSearchParams();
  const orderId = Number(params.get("orderId"));

  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderApi.get(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0
  });

  const createPayment = useMutation({
    mutationFn: () => paymentApi.create(orderId, newIdempotencyKey()),
    onSuccess: (payment) => {
      if (isSafeHttpUrl(payment.paymentUrl)) {
        window.location.href = payment.paymentUrl;
      }
    }
  });

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <main className="page">
        <EmptyState title="Missing order" body="Open payment from an order so the order id is present.">
          <Link className="button buttonDark" href="/orders">
            Orders
          </Link>
        </EmptyState>
      </main>
    );
  }

  const payment = createPayment.data;

  return (
    <Protected>
      <main className="page">
        <div className="stack" style={{ gap: 6, marginBottom: 24 }}>
          <span className="kicker">Checkout · step 3 of 3</span>
          <h1 className="title">Pay for your order.</h1>
        </div>
        <section className="split">
          <div className="card stack" style={{ padding: 24 }}>
            {order.isLoading ? (
              <Skeleton lines={4} />
            ) : order.data ? (
              <div className="stack" style={{ gap: 8 }}>
                <span className="mono muted" style={{ fontSize: "0.85rem" }}>
                  Order {order.data.orderNumber}
                </span>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Subtotal</span>
                  <span className="price">{formatPrice(order.data.subtotalAmount)}</span>
                </div>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Shipping</span>
                  <span className="price">{formatPrice(order.data.shippingAmount)}</span>
                </div>
                {order.data.discountAmount > 0 ? (
                  <div className="toolbar" style={{ justifyContent: "space-between" }}>
                    <span className="muted">Discount{order.data.promoCode ? ` (${order.data.promoCode})` : ""}</span>
                    <span className="price">&minus;{formatPrice(order.data.discountAmount)}</span>
                  </div>
                ) : null}
                <hr className="divider" />
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>Total</span>
                  <span className="price" style={{ fontSize: "1.6rem" }}>
                    {formatPrice(order.data.paymentAmount)}
                  </span>
                </div>
              </div>
            ) : null}
            {order.error ? <p className="errorText" style={{ margin: 0 }}>{(order.error as Error).message}</p> : null}
            <button
              className="button buttonAccent"
              disabled={createPayment.isPending || Boolean(payment)}
              onClick={() => createPayment.mutate()}
            >
              {createPayment.isPending ? "Creating payment..." : "Pay now"}
            </button>
            {createPayment.error ? (
              <p className="errorText" style={{ margin: 0 }}>
                {(createPayment.error as Error).message}
              </p>
            ) : null}
            {payment && isSafeHttpUrl(payment.paymentUrl) ? (
              <p className="muted" style={{ margin: 0 }}>
                Redirecting to the payment provider...
              </p>
            ) : null}
            <Link className="button" style={{ justifySelf: "start" }} href={`/orders/${orderId}`}>
              Back to order
            </Link>
          </div>

          {payment && !isSafeHttpUrl(payment.paymentUrl) ? (
            <aside className="card stack" style={{ padding: 24 }}>
              <span className="status statusWarn">{payment.status.toLowerCase()}</span>
              <p className="mono" style={{ margin: 0 }}>
                Payment #{payment.id} · {formatPrice(payment.amount)} {payment.currency}
              </p>
              <Link className="button buttonDark" href={`/payment/${payment.id}`}>
                Track payment status
              </Link>
            </aside>
          ) : null}
        </section>
      </main>
    </Protected>
  );
}
