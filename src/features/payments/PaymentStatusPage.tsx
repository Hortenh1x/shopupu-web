"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { paymentApi } from "@/lib/api/shop";

export function PaymentStatusPage({ paymentId }: { paymentId: number }) {
  const router = useRouter();
  const payment = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => paymentApi.get(paymentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["SUCCEEDED", "FAILED", "CANCELED", "EXPIRED", "REFUNDED"].includes(status) ? false : 3000;
    }
  });

  useEffect(() => {
    const status = payment.data?.status;
    if (status === "SUCCEEDED") router.push(`/payment/success?paymentId=${paymentId}`);
    if (["FAILED", "CANCELED", "EXPIRED"].includes(status ?? "")) router.push(`/payment/failed?paymentId=${paymentId}`);
  }, [payment.data?.status, paymentId, router]);

  if (payment.isLoading) return <EmptyState title="Loading payment" />;
  if (!payment.data) return <EmptyState title="Payment not found" />;

  return (
    <Protected>
      <main className="page">
        <section className="split">
          <div className="brutal stack" style={{ padding: 28 }}>
            <h1 className="title">Waiting for bank</h1>
            <p className="subhead muted">The browser checks payment status every 3 seconds after bank confirmation.</p>
            <span className="status">{payment.data.status}</span>
            <p>External payment id: {payment.data.externalPaymentId}</p>
            <p>Amount: {Number(payment.data.amount).toFixed(2)} {payment.data.currency}</p>
            <div className="toolbar">
              {payment.data.paymentUrl ? (
                <a className="button buttonDark" href={payment.data.paymentUrl}>
                  Open bank app
                </a>
              ) : null}
              {payment.data.externalPaymentId ? (
                <button className="button" onClick={() => navigator.clipboard.writeText(payment.data.externalPaymentId ?? "")}>
                  Copy payment id
                </button>
              ) : null}
              <Link className="button" href={`/orders/${payment.data.orderId}`}>
                Order
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Protected>
  );
}
