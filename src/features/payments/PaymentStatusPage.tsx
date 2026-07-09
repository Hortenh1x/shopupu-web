"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/features/catalog/ProductCard";
import { paymentApi } from "@/lib/api/shop";
import type { PaymentStatus } from "@/lib/api/types";

const failedStatuses: PaymentStatus[] = ["FAILED", "CANCELED", "EXPIRED"];

function statusClass(status: PaymentStatus) {
  if (status === "SUCCEEDED") return "status statusOk";
  if (failedStatuses.includes(status)) return "status statusDanger";
  if (status === "REFUNDED") return "status statusBrand";
  return "status statusWarn";
}

export function PaymentStatusPage({ paymentId }: { paymentId: number }) {
  const payment = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => paymentApi.get(paymentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // poll while the payment can still change
      return !status || status === "CREATED" || status === "PENDING" ? 3000 : false;
    }
  });

  return (
    <Protected>
      <main className="page">
        {payment.isLoading ? (
          <Skeleton lines={4} />
        ) : !payment.data ? (
          <EmptyState title="Payment not found" body={(payment.error as Error | null)?.message}>
            <Link className="button" href="/orders">
              Orders
            </Link>
          </EmptyState>
        ) : (
          <section className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start", gap: 14 }}>
            {payment.data.status === "SUCCEEDED" ? (
              <>
                <h1 className="title">
                  Payment <span className="mark">succeeded</span>.
                </h1>
                <p className="subhead" style={{ margin: 0 }}>
                  The order is paid and moves on to processing.
                </p>
              </>
            ) : failedStatuses.includes(payment.data.status) ? (
              <>
                <h1 className="title">Payment {payment.data.status.toLowerCase()}.</h1>
                <p className="subhead" style={{ margin: 0 }}>
                  The payment did not go through. You can retry from the order.
                </p>
              </>
            ) : payment.data.status === "REFUNDED" ? (
              <>
                <h1 className="title">Payment refunded.</h1>
                <p className="subhead" style={{ margin: 0 }}>
                  The amount was returned to the original payment method.
                </p>
              </>
            ) : (
              <>
                <h1 className="title">Waiting for confirmation.</h1>
                <p className="subhead" style={{ margin: 0 }}>
                  The payment status refreshes every 3 seconds.
                </p>
              </>
            )}
            <span className={statusClass(payment.data.status)}>{payment.data.status.toLowerCase()}</span>
            <p className="mono" style={{ margin: 0 }}>
              {formatPrice(payment.data.amount)} {payment.data.currency}
            </p>
            {payment.data.externalPaymentId ? (
              <p className="mono muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                External payment id: {payment.data.externalPaymentId}
              </p>
            ) : null}
            <div className="toolbar">
              {payment.data.status === "SUCCEEDED" ? (
                <Link className="button buttonDark" href={`/orders/${payment.data.orderId}`}>
                  Open order
                </Link>
              ) : null}
              {failedStatuses.includes(payment.data.status) ? (
                <Link className="button buttonDark" href={`/checkout/payment?orderId=${payment.data.orderId}`}>
                  Retry payment
                </Link>
              ) : null}
              {(payment.data.status === "CREATED" || payment.data.status === "PENDING") && payment.data.paymentUrl ? (
                <a className="button buttonDark" href={payment.data.paymentUrl}>
                  Open bank app
                </a>
              ) : null}
              <Link className="button" href={`/orders/${payment.data.orderId}`}>
                Order
              </Link>
            </div>
          </section>
        )}
      </main>
    </Protected>
  );
}
