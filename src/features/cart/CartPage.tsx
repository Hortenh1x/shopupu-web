"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/features/catalog/ProductCard";
import { cartApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

export function CartPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  // wait until the session is restored so the request carries the right identity
  const cart = useQuery({
    queryKey: ["cart", auth.user?.id ?? "guest"],
    queryFn: cartApi.get,
    enabled: auth.isReady
  });
  const update = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: number; quantity: number }) =>
      // quantity 0 removes the line server-side
      cartApi.setQuantity(variantId, quantity),
    onSuccess: (data) => queryClient.setQueryData(["cart", auth.user?.id ?? "guest"], data)
  });
  const remove = useMutation({
    mutationFn: (variantId: number) => cartApi.remove(variantId),
    onSuccess: (data) => queryClient.setQueryData(["cart", auth.user?.id ?? "guest"], data)
  });

  if (cart.isLoading || !auth.isReady) {
    return (
      <main className="page">
        <h1 className="title" style={{ marginBottom: 24 }}>
          Cart
        </h1>
        <Skeleton lines={4} />
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="title" style={{ marginBottom: 24 }}>
        Cart
      </h1>
      {cart.error ? <p className="errorText">{(cart.error as Error).message}</p> : null}
      {!cart.data?.items?.length ? (
        <EmptyState title="Your cart is empty." body="Everything you add is kept, even before you sign in.">
          <Link className="button buttonDark" href="/catalog">
            Browse the catalog
          </Link>
        </EmptyState>
      ) : (
        <section className="split">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {cart.data.items.map((item) => (
                  <tr key={item.variantId}>
                    <td>
                      <div className="stack" style={{ gap: 3 }}>
                        <Link href={`/products/${item.productId}`} style={{ fontWeight: 600 }}>
                          {item.title}
                        </Link>
                        <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                          {[item.size, item.color, item.sku].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </td>
                    <td className="price">{formatPrice(item.price)}</td>
                    <td>
                      <div className="qty">
                        <button
                          aria-label="Decrease quantity"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ variantId: item.variantId, quantity: item.quantity - 1 })}
                        >
                          &minus;
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          aria-label="Increase quantity"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ variantId: item.variantId, quantity: item.quantity + 1 })}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="price">{formatPrice(item.lineTotal)}</td>
                    <td>
                      <button
                        className="button buttonRed buttonSmall"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(item.variantId)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {update.error ? <p className="errorText">{(update.error as Error).message}</p> : null}
            {remove.error ? <p className="errorText">{(remove.error as Error).message}</p> : null}
          </div>

          <aside className="panelInk stack" style={{ position: "sticky", top: 84, padding: 28, gap: 14 }}>
            <h2 className="subtitle" style={{ margin: 0 }}>
              Order summary.
            </h2>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <span className="muted">
                {cart.data.totalItems} item{cart.data.totalItems === 1 ? "" : "s"}
              </span>
              <span className="price" style={{ fontSize: "1.7rem" }}>
                {formatPrice(cart.data.subtotal)}
              </span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Shipping and promo codes are applied at checkout.
            </p>
            {!auth.isReady ? null : auth.isAuthenticated ? (
              <Link className="button buttonAccent" href="/checkout">
                Proceed to checkout
              </Link>
            ) : (
              <>
                <Link className="button buttonAccent" href="/login">
                  Sign in to checkout
                </Link>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  Your cart is kept and merges into your account after you sign in.
                </p>
              </>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
