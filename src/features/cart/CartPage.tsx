"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
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

  if (cart.isLoading) {
    return (
      <main className="page">
        <h1 className="title">Cart</h1>
        <Skeleton lines={4} />
      </main>
    );
  }

  return (
    <main className="page">
      <h1 className="title">Cart</h1>
      {cart.error ? <p className="muted">{(cart.error as Error).message}</p> : null}
      {!cart.data?.items?.length ? (
        <EmptyState title="Empty cart" body="Add products from catalog.">
          <Link className="button buttonDark" href="/catalog">
            Browse catalog
          </Link>
        </EmptyState>
      ) : (
        <section className="split">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.data.items.map((item) => (
                  <tr key={item.variantId}>
                    <td>
                      <Link href={`/products/${item.productId}`}>{item.title}</Link>
                    </td>
                    <td className="muted">{item.sku}</td>
                    <td>{item.size}</td>
                    <td>{item.color ?? "-"}</td>
                    <td>{item.price.toFixed(2)} EUR</td>
                    <td>
                      <div className="toolbar">
                        <button
                          className="button"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ variantId: item.variantId, quantity: item.quantity - 1 })}
                        >
                          -
                        </button>
                        <span className="status">{item.quantity}</span>
                        <button
                          className="button"
                          disabled={update.isPending}
                          onClick={() => update.mutate({ variantId: item.variantId, quantity: item.quantity + 1 })}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>{item.lineTotal.toFixed(2)} EUR</td>
                    <td>
                      <button
                        className="button buttonRed"
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
            {update.error ? <p className="muted">{(update.error as Error).message}</p> : null}
            {remove.error ? <p className="muted">{(remove.error as Error).message}</p> : null}
          </div>
          <aside className="card stack" style={{ position: "sticky", top: 92 }}>
            <h2 className="title">Summary</h2>
            <p className="muted">{cart.data.totalItems} item(s)</p>
            <strong style={{ fontSize: "2rem" }}>{cart.data.subtotal.toFixed(2)} EUR</strong>
            {!auth.isReady ? null : auth.isAuthenticated ? (
              <Link className="button buttonDark" href="/checkout">
                Proceed to checkout
              </Link>
            ) : (
              <>
                <Link className="button buttonDark" href="/login">
                  Login to checkout
                </Link>
                <p className="muted">Your cart is kept and will be merged into your account after login.</p>
              </>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
