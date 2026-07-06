"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewPanel } from "@/features/reviews/ReviewPanel";
import { cartApi, catalogApi, userApi } from "@/lib/api/shop";
import type { Variant } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

export function ProductDetails({ productId }: { productId: number }) {
  const auth = useAuth();
  const product = useQuery({ queryKey: ["product", productId], queryFn: () => catalogApi.product(productId) });
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const variants = useMemo(
    () => (product.data?.variants ?? []).filter((variant) => variant.enabled),
    [product.data]
  );
  const selected: Variant | null =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null;

  const addToCart = useMutation({
    mutationFn: () => cartApi.add(selected!.id, quantity)
  });
  const wishlist = useMutation({
    mutationFn: () => userApi.addToWishlist(productId)
  });

  if (product.isLoading) return <EmptyState title="Loading product" />;
  if (product.error || !product.data)
    return <EmptyState title="Product not found" body="The product is unavailable or disabled." />;

  const current = product.data;
  const images = current.images ?? [];
  const image = images[activeImage] ?? images[0];
  const available = selected?.available ?? 0;

  return (
    <main className="page">
      <section className="split">
        <div className="brutal" style={{ padding: 16 }}>
          <div
            style={{
              minHeight: 420,
              border: "1px solid var(--color-border-soft)",
              borderRadius: 16,
              background: image?.url
                ? `center / cover no-repeat url(${image.url})`
                : "linear-gradient(135deg, var(--color-concrete), var(--color-paper))"
            }}
          />
          {images.length > 1 ? (
            <div className="toolbar" style={{ marginTop: 12 }}>
              {images.map((img, index) => (
                <button
                  key={img.id}
                  className="button"
                  onClick={() => setActiveImage(index)}
                  style={{
                    width: 56,
                    height: 56,
                    padding: 0,
                    background: `center / cover no-repeat url(${img.url})`,
                    outline: index === activeImage ? "3px solid var(--color-black)" : "none"
                  }}
                  aria-label={img.altText ?? `image ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="card stack">
          <span className="status">
            {current.brandName ? `${current.brandName} / ` : ""}
            {current.categoryName ?? "catalog"}
          </span>
          <h1 className="title">{current.title}</h1>
          <span>
            <strong style={{ fontSize: "2rem" }}>{Number(selected?.price ?? current.price).toFixed(2)} EUR</strong>{" "}
            {(selected?.oldPrice ?? current.oldPrice) ? (
              <span className="muted" style={{ textDecoration: "line-through", fontSize: "1.2rem" }}>
                {Number(selected?.oldPrice ?? current.oldPrice).toFixed(2)} EUR
              </span>
            ) : null}
          </span>
          <p>{current.description}</p>
          <p className="muted">
            {[current.gender ? current.gender.toLowerCase() : null, current.season, current.material]
              .filter(Boolean)
              .join(" / ") || null}
          </p>
          {current.careInstructions ? <p className="muted">Care: {current.careInstructions}</p> : null}

          {variants.length ? (
            <>
              <label className="label">
                Size / color
                <select
                  className="select"
                  value={selected?.id ?? ""}
                  onChange={(event) => setSelectedVariantId(Number(event.target.value))}
                >
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.size}
                      {variant.color ? ` / ${variant.color}` : ""} - {Number(variant.price).toFixed(2)} EUR
                      {(variant.available ?? 0) <= 0 ? " (out of stock)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                SKU {selected?.sku} - {available > 0 ? `in stock: ${available}` : "out of stock"}
              </p>
              <label className="label">
                Quantity
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={Math.max(available, 1)}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                  style={{ width: 100 }}
                />
              </label>
              <button
                className="button buttonDark"
                disabled={addToCart.isPending || !selected || available <= 0}
                onClick={() => addToCart.mutate()}
              >
                Add to cart
              </button>
              {addToCart.isSuccess ? <p className="status">Added to cart</p> : null}
              {addToCart.error ? <p className="muted">{(addToCart.error as Error).message}</p> : null}
            </>
          ) : (
            <p className="muted">No variants available for this product yet.</p>
          )}

          {auth.isAuthenticated ? (
            <button className="button" disabled={wishlist.isPending} onClick={() => wishlist.mutate()}>
              {wishlist.isSuccess ? "In wishlist" : "Add to wishlist"}
            </button>
          ) : null}
        </aside>
      </section>
      <ReviewPanel productId={productId} />
    </main>
  );
}
