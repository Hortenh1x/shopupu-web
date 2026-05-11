"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { cartApi } from "@/lib/api/shop";

export function CartPage() {
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ["cart"], queryFn: cartApi.get });
  const update = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) => cartApi.setQuantity(productId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] })
  });
  const remove = useMutation({
    mutationFn: (productId: number) => cartApi.remove(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] })
  });

  return (
    <Protected>
      <main className="page">
        <h1 className="title">Cart</h1>
        {!cart.data?.items?.length ? (
          <EmptyState title="Empty cart" body="Add products from catalog." />
        ) : (
          <section className="split">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.data.items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.title}</td>
                    <td>{Number(item.unitPrice).toFixed(2)} EUR</td>
                    <td>
                      <div className="toolbar">
                        <button className="button" onClick={() => update.mutate({ productId: item.productId, quantity: Math.max(1, item.quantity - 1) })}>
                          -
                        </button>
                        <span className="status">{item.quantity}</span>
                        <button className="button" onClick={() => update.mutate({ productId: item.productId, quantity: item.quantity + 1 })}>
                          +
                        </button>
                      </div>
                    </td>
                    <td>{Number(item.lineTotal).toFixed(2)} EUR</td>
                    <td>
                      <button className="button buttonRed" onClick={() => remove.mutate(item.productId)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <aside className="card stack" style={{ position: "sticky", top: 92 }}>
              <h2 className="title">Summary</h2>
              <strong style={{ fontSize: "2rem" }}>{Number(cart.data.subtotal).toFixed(2)} EUR</strong>
              <Link className="button buttonDark" href="/checkout">
                Checkout
              </Link>
            </aside>
          </section>
        )}
      </main>
    </Protected>
  );
}
