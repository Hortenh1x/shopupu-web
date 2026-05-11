"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewPanel } from "@/features/reviews/ReviewPanel";
import { cartApi, catalogApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

export function ProductDetails({ productId }: { productId: number }) {
  const auth = useAuth();
  const product = useQuery({ queryKey: ["product", productId], queryFn: () => catalogApi.product(productId) });
  const addToCart = useMutation({ mutationFn: () => cartApi.add(productId, 1) });

  if (product.isLoading) return <EmptyState title="Loading product" />;
  if (product.error || !product.data) return <EmptyState title="Product not found" body="The product is unavailable or disabled." />;

  const current = product.data;
  const image = current.images?.[0];

  return (
    <main className="page">
      <section className="split">
        <div className="brutal" style={{ padding: 16 }}>
          <div
            style={{
              minHeight: 480,
              border: "1px solid var(--color-border-soft)",
              borderRadius: 16,
              background: image?.url
                ? `center / cover no-repeat url(${image.url})`
                : "linear-gradient(135deg, var(--color-concrete), var(--color-paper))"
            }}
          />
        </div>
        <aside className="card stack">
          <span className="status">{current.categoryName ?? "catalog"}</span>
          <h1 className="title">{current.title}</h1>
          <strong style={{ fontSize: "2rem" }}>{Number(current.price).toFixed(2)} EUR</strong>
          <p>{current.description}</p>
          <p className="muted">SKU {current.sku} / stock {current.stock}</p>
          {auth.isAuthenticated ? (
            <button className="button buttonDark" disabled={addToCart.isPending || current.stock <= 0} onClick={() => addToCart.mutate()}>
              Add to cart
            </button>
          ) : (
            <Link className="button" href="/login">
              Login to buy
            </Link>
          )}
          {addToCart.isSuccess ? <p className="status">Added</p> : null}
          {addToCart.error ? <p className="muted">{addToCart.error.message}</p> : null}
        </aside>
      </section>
      <ReviewPanel productId={productId} />
    </main>
  );
}
