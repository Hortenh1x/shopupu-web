"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { newIdempotencyKey } from "@/lib/api/client";
import { cartApi, orderApi, promoApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

export function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [code, setCode] = useState("");

  // checkout is authenticated-only; wait for the restored session
  const cart = useQuery({
    queryKey: ["cart", auth.user?.id ?? "guest"],
    queryFn: cartApi.get,
    enabled: auth.isReady && auth.isAuthenticated
  });

  const promo = useMutation({ mutationFn: (value: string) => promoApi.validate(value) });
  const appliedCode = promo.data?.code ?? null;

  const checkout = useMutation({
    mutationFn: () => orderApi.checkout({ promoCode: appliedCode, idempotencyKey: newIdempotencyKey() }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/checkout/shipping?orderId=${order.id}`);
    }
  });

  return (
    <Protected>
      <main className="page">
        <h1 className="title">Checkout</h1>
        {cart.isLoading ? (
          <Skeleton lines={4} />
        ) : !cart.data?.items?.length ? (
          <EmptyState title="Empty cart" body="Add products before checking out.">
            <Link className="button buttonDark" href="/catalog">
              Browse catalog
            </Link>
          </EmptyState>
        ) : (
          <section className="split">
            <div className="stack">
              <h2 className="headline">Review items</h2>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Size</th>
                      <th>Color</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.data.items.map((item) => (
                      <tr key={item.variantId}>
                        <td>{item.title}</td>
                        <td className="muted">{item.sku}</td>
                        <td>{item.size}</td>
                        <td>{item.color ?? "-"}</td>
                        <td>
                          {item.quantity} x {item.price.toFixed(2)} EUR
                        </td>
                        <td>{item.lineTotal.toFixed(2)} EUR</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link className="button" href="/cart">
                Edit cart
              </Link>
            </div>
            <aside className="card stack">
              <h2 className="headline">Summary</h2>
              <p>Subtotal: {cart.data.subtotal.toFixed(2)} EUR</p>
              <label className="label">
                Promo code
                <div className="toolbar">
                  <input
                    className="input"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="PROMO2026"
                  />
                  <button
                    className="button"
                    type="button"
                    disabled={promo.isPending || !code.trim()}
                    onClick={() => promo.mutate(code.trim())}
                  >
                    Apply
                  </button>
                </div>
              </label>
              {promo.data ? (
                <p className="status">
                  {promo.data.code} ({promo.data.promoType}): -{promo.data.discount.toFixed(2)} EUR
                  <button className="button" type="button" style={{ marginLeft: 8 }} onClick={() => promo.reset()}>
                    Remove
                  </button>
                </p>
              ) : null}
              {promo.error ? <p className="muted">{(promo.error as Error).message}</p> : null}
              <button className="button buttonDark" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                Place order
              </button>
              {checkout.error ? <p className="muted">{(checkout.error as Error).message}</p> : null}
              <p className="muted">Shipping is chosen on the next step and added to the total.</p>
            </aside>
          </section>
        )}
      </main>
    </Protected>
  );
}
