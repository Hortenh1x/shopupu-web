"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/features/catalog/ProductCard";
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
        <div className="stack" style={{ gap: 6, marginBottom: 24 }}>
          <span className="kicker">Checkout · step 1 of 3</span>
          <h1 className="title">Review your order.</h1>
        </div>
        {cart.isLoading ? (
          <Skeleton lines={4} />
        ) : !cart.data?.items?.length ? (
          <EmptyState title="Your cart is empty." body="Add products before checking out.">
            <Link className="button buttonDark" href="/catalog">
              Browse the catalog
            </Link>
          </EmptyState>
        ) : (
          <section className="split">
            <div className="stack">
              <div style={{ overflowX: "auto" }}>
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
                    {cart.data.items.map((item) => (
                      <tr key={item.variantId}>
                        <td>
                          <div className="stack" style={{ gap: 3 }}>
                            <span style={{ fontWeight: 600 }}>{item.title}</span>
                            <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                              {[item.size, item.color, item.sku].filter(Boolean).join(" · ")}
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
              </div>
              <Link className="button" style={{ justifySelf: "start" }} href="/cart">
                Edit cart
              </Link>
            </div>

            <aside className="card stack" style={{ padding: 24 }}>
              <h2 className="subtitle" style={{ margin: 0 }}>
                Summary.
              </h2>
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span className="muted">Subtotal</span>
                <span className="price" style={{ fontSize: "1.4rem" }}>
                  {formatPrice(cart.data.subtotal)}
                </span>
              </div>
              <label className="label">
                Promo code
                <div className="toolbar" style={{ flexWrap: "nowrap" }}>
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
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="status statusOk">
                    {promo.data.code} &minus;{formatPrice(promo.data.discount)}
                  </span>
                  <button className="button buttonSmall" type="button" onClick={() => promo.reset()}>
                    Remove
                  </button>
                </div>
              ) : null}
              {promo.error ? <p className="errorText" style={{ margin: 0 }}>{(promo.error as Error).message}</p> : null}
              <button className="button buttonDark" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                {checkout.isPending ? "Placing order..." : "Place order"}
              </button>
              {checkout.error ? <p className="errorText" style={{ margin: 0 }}>{(checkout.error as Error).message}</p> : null}
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Shipping is chosen on the next step and added to the total.
              </p>
            </aside>
          </section>
        )}
      </main>
    </Protected>
  );
}
