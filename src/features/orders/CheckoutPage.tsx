"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { orderApi } from "@/lib/api/shop";

export function CheckoutPage() {
  const router = useRouter();
  const checkout = useMutation({
    mutationFn: orderApi.checkout,
    onSuccess: (order) => router.push(`/checkout/shipping?orderId=${order.id}`)
  });

  return (
    <Protected>
      <main className="page">
        <section className="brutal stack" style={{ padding: 28 }}>
          <h1 className="title">Checkout</h1>
          <p className="subhead muted">Create an order from the current cart, then choose shipping before payment.</p>
          <button className="button buttonDark" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
            Create order
          </button>
          {checkout.error ? <p className="muted">{checkout.error.message}</p> : null}
        </section>
      </main>
    </Protected>
  );
}
