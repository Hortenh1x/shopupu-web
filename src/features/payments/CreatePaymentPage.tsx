"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { newIdempotencyKey } from "@/lib/api/client";
import { orderApi, paymentApi } from "@/lib/api/shop";

function isAbsoluteHttpUrl(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

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
      if (isAbsoluteHttpUrl(payment.paymentUrl)) {
        window.location.href = payment.paymentUrl;
      }
    }
  });

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <EmptyState title="Missing order" body="Open payment from an order so the order id is present.">
        <Link className="button buttonDark" href="/orders">
          Orders
        </Link>
      </EmptyState>
    );
  }

  const payment = createPayment.data;

  return (
    <Protected>
      <main className="page">
        <section className="brutal stack" style={{ padding: 28 }}>
          <h1 className="title">Payment</h1>
          {order.isLoading ? (
            <Skeleton lines={4} />
          ) : order.data ? (
            <div className="card stack">
              <h2 className="headline">Order {order.data.orderNumber}</h2>
              <p>Subtotal: {order.data.subtotalAmount.toFixed(2)} EUR</p>
              <p>Shipping: {order.data.shippingAmount.toFixed(2)} EUR</p>
              {order.data.discountAmount > 0 ? (
                <p>
                  Discount{order.data.promoCode ? ` (${order.data.promoCode})` : ""}: -
                  {order.data.discountAmount.toFixed(2)} EUR
                </p>
              ) : null}
              <strong style={{ fontSize: "1.5rem" }}>Total: {order.data.paymentAmount.toFixed(2)} EUR</strong>
            </div>
          ) : null}
          {order.error ? <p className="muted">{(order.error as Error).message}</p> : null}
          <button
            className="button buttonDark"
            disabled={createPayment.isPending || Boolean(payment)}
            onClick={() => createPayment.mutate()}
          >
            Pay now
          </button>
          {createPayment.error ? <p className="muted">{(createPayment.error as Error).message}</p> : null}
          {payment && !isAbsoluteHttpUrl(payment.paymentUrl) ? (
            <div className="card stack">
              <span className="status">{payment.status}</span>
              <p>
                Payment #{payment.id}: {payment.amount.toFixed(2)} {payment.currency}
              </p>
              <Link className="button buttonDark" href={`/payment/${payment.id}`}>
                Track payment status
              </Link>
            </div>
          ) : null}
          {payment && isAbsoluteHttpUrl(payment.paymentUrl) ? (
            <p className="muted">Redirecting to the payment provider...</p>
          ) : null}
          <Link className="button" href={`/orders/${orderId}`}>
            Back to order
          </Link>
        </section>
      </main>
    </Protected>
  );
}
