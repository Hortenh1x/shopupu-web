"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Protected } from "@/components/layout/Protected";
import { paymentApi } from "@/lib/api/shop";

export function CreatePaymentPage() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = Number(params.get("orderId"));
  const createPayment = useMutation({
    mutationFn: () => paymentApi.create(orderId),
    onSuccess: (payment) => router.push(`/payment/${payment.id}`)
  });

  return (
    <Protected>
      <main className="page">
        <section className="brutal stack" style={{ padding: 28 }}>
          <h1 className="title">Payment</h1>
          <p className="subhead muted">Create a payment intent and open the bank app to approve it.</p>
          <button className="button buttonDark" disabled={createPayment.isPending || !orderId} onClick={() => createPayment.mutate()}>
            Create payment
          </button>
          {createPayment.error ? <p className="muted">{createPayment.error.message}</p> : null}
          <Link className="button" href={`/orders/${orderId}`}>
            Back to order
          </Link>
        </section>
      </main>
    </Protected>
  );
}
