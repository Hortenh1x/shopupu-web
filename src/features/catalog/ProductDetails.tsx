"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingStars } from "@/components/ui/RatingStars";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard, formatPrice } from "@/features/catalog/ProductCard";
import { ReviewPanel } from "@/features/reviews/ReviewPanel";
import { aiApi, cartApi, catalogApi, userApi } from "@/lib/api/shop";
import type { ProductListItem, Variant } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

function sizeRank(size: string) {
  const index = SIZE_ORDER.indexOf(size.toUpperCase());
  return index === -1 ? SIZE_ORDER.length + size.charCodeAt(0) : index;
}

export function ProductDetails({ productId }: { productId: number }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const product = useQuery({ queryKey: ["product", productId], queryFn: () => catalogApi.product(productId) });
  const rating = useQuery({ queryKey: ["rating", productId], queryFn: () => catalogApi.rating(productId) });

  const variants = useMemo(
    () => (product.data?.variants ?? []).filter((variant) => variant.enabled),
    [product.data]
  );

  const sizes = useMemo(() => {
    const unique = [...new Set(variants.map((variant) => variant.size))];
    return unique.sort((a, b) => sizeRank(a) - sizeRank(b));
  }, [variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const size = selectedSize ?? sizes.find((s) => hasStock(variants, s)) ?? sizes[0] ?? null;
  const colors = useMemo(
    () => [...new Set(variants.filter((variant) => variant.size === size).map((variant) => variant.color ?? ""))],
    [variants, size]
  );
  const color = selectedColor != null && colors.includes(selectedColor) ? selectedColor : (colors[0] ?? null);

  const selected: Variant | null =
    variants.find((variant) => variant.size === size && (variant.color ?? "") === color) ??
    variants.find((variant) => variant.size === size) ??
    null;
  const available = selected?.available ?? 0;

  const addToCart = useMutation({
    mutationFn: () => cartApi.add(selected!.id, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] })
  });
  const wishlist = useMutation({
    mutationFn: () => userApi.addToWishlist(productId)
  });

  if (product.isLoading) {
    return (
      <main className="page">
        <div className="split">
          <div className="skeletonBlock" style={{ aspectRatio: "4 / 5", borderRadius: "var(--radius-panel)" }} />
          <Skeleton lines={6} />
        </div>
      </main>
    );
  }

  if (product.error || !product.data) {
    return (
      <main className="page">
        <EmptyState title="Product not found" body="The product is unavailable or disabled.">
          <Link className="button buttonDark" href="/catalog">
            Back to catalog
          </Link>
        </EmptyState>
      </main>
    );
  }

  const current = product.data;
  const images = current.images ?? [];
  const image = images[activeImage] ?? images[0];
  const displayPrice = selected?.price ?? current.price;
  const displayOldPrice = selected?.oldPrice ?? current.oldPrice;
  const onSale = displayOldPrice != null && Number(displayOldPrice) > Number(displayPrice);
  const meta = [current.gender ? current.gender.toLowerCase() : null, current.season, current.material]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="page">
      <section className="split">
        <div className="stack" style={{ gap: 12 }}>
          <div className="productMedia" style={{ borderRadius: "var(--radius-panel)", border: "1px solid var(--line)" }}>
            {image?.url ? (
              <img src={image.url} alt={image.altText ?? current.title} />
            ) : (
              <span className="placeholder" aria-hidden="true">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M8 4l-5 4 2.5 3L8 9.5V20h8V9.5l2.5 1.5L21 8l-5-4a4 4 0 0 1-8 0Z" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            {onSale ? <span className="badgeSale">Sale</span> : null}
          </div>
          {images.length > 1 ? (
            <div className="toolbar" style={{ gap: 8 }}>
              {images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(index)}
                  aria-label={img.altText ?? `Image ${index + 1}`}
                  aria-current={index === activeImage}
                  style={{
                    width: 64,
                    height: 78,
                    padding: 0,
                    borderRadius: 10,
                    border: index === activeImage ? "2px solid var(--ink)" : "1px solid var(--line-strong)",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "var(--surface)"
                  }}
                >
                  <img
                    src={img.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="card stack" style={{ position: "sticky", top: 84, padding: 24, gap: 14 }}>
          <span className="kicker">
            {[current.brandName, current.categoryName].filter(Boolean).join(" · ") || "catalog"}
          </span>
          <h1 className="title">{current.title}</h1>
          {rating.data && rating.data.reviewCount > 0 ? (
            <span className="toolbar" style={{ gap: 8 }}>
              <RatingStars value={Number(rating.data.averageRating)} />
              <span className="mono muted" style={{ fontSize: "0.85rem" }}>
                {Number(rating.data.averageRating).toFixed(1)} · {rating.data.reviewCount} review
                {rating.data.reviewCount === 1 ? "" : "s"}
              </span>
            </span>
          ) : null}
          <span style={{ display: "inline-flex", gap: 12, alignItems: "baseline" }}>
            <span className="price" style={{ fontSize: "1.9rem" }}>
              {formatPrice(displayPrice)}
            </span>
            {onSale ? (
              <span className="priceOld" style={{ fontSize: "1.1rem" }}>
                {formatPrice(displayOldPrice!)}
              </span>
            ) : null}
          </span>
          {current.description ? <p style={{ margin: 0 }}>{current.description}</p> : null}
          {meta ? (
            <p className="mono muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              {meta}
            </p>
          ) : null}

          {variants.length ? (
            <>
              <div className="stack" style={{ gap: 8 }}>
                <span className="kicker">Size</span>
                <div className="chipRow">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip"
                      data-selected={s === size}
                      disabled={!hasStock(variants, s)}
                      onClick={() => {
                        setSelectedSize(s);
                        setSelectedColor(null);
                        setQuantity(1);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {colors.length > 1 || (colors.length === 1 && colors[0] !== "") ? (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="kicker">Color</span>
                  <div className="chipRow">
                    {colors.map((c) => {
                      const variant = variants.find((v) => v.size === size && (v.color ?? "") === c);
                      const out = (variant?.available ?? 0) <= 0;
                      return (
                        <button
                          key={c || "one-color"}
                          type="button"
                          className="chip"
                          data-selected={c === color}
                          disabled={out}
                          onClick={() => {
                            setSelectedColor(c);
                            setQuantity(1);
                          }}
                        >
                          {c || "one color"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <p className="mono muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                {selected ? `SKU ${selected.sku}` : ""}
                {selected ? " · " : ""}
                {available > 0 ? `${available} in stock` : "out of stock"}
              </p>

              <div className="toolbar" style={{ gap: 12 }}>
                <div className="qty">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    &minus;
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={quantity >= available}
                    onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                  >
                    +
                  </button>
                </div>
                <button
                  className="button buttonDark"
                  style={{ flex: 1 }}
                  disabled={addToCart.isPending || !selected || available <= 0}
                  onClick={() => addToCart.mutate()}
                >
                  {addToCart.isPending ? "Adding..." : "Add to cart"}
                </button>
              </div>
              {addToCart.isSuccess ? (
                <p className="statusOk status" style={{ margin: 0 }}>
                  Added to cart ·{" "}
                  <Link href="/cart" style={{ textDecoration: "underline" }}>
                    view cart
                  </Link>
                </p>
              ) : null}
              {addToCart.error ? <p className="errorText">{(addToCart.error as Error).message}</p> : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No variants available for this product yet.
            </p>
          )}

          {auth.isAuthenticated ? (
            <button
              className="button"
              disabled={wishlist.isPending || wishlist.isSuccess}
              onClick={() => wishlist.mutate()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill={wishlist.isSuccess ? "var(--primary)" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 21S3 13.9 3 8.6C3 5.5 5.4 3 8.4 3c1.5 0 2.9.7 3.6 1.8C12.7 3.7 14.1 3 15.6 3 18.6 3 21 5.5 21 8.6c0 5.3-9 12.4-9 12.4Z" strokeLinejoin="round" />
              </svg>
              {wishlist.isSuccess ? "Saved to wishlist" : "Add to wishlist"}
            </button>
          ) : null}
          {current.careInstructions ? (
            <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
              Care: {current.careInstructions}
            </p>
          ) : null}
        </aside>
      </section>

      <RecommendationRail
        title="You may also like."
        productId={productId}
        fetch={() => aiApi.similar(productId, 4)}
        queryKey={["similar", productId]}
      />

      <ReviewPanel productId={productId} />

      <RecommendationRail
        title="Often bought together."
        productId={productId}
        fetch={() => aiApi.boughtTogether(productId, 4)}
        queryKey={["bought-together", productId]}
      />
    </main>
  );
}

function RecommendationRail({
  title,
  productId,
  fetch,
  queryKey
}: {
  title: string;
  productId: number;
  fetch: () => Promise<ProductListItem[]>;
  queryKey: (string | number)[];
}) {
  const rail = useQuery({ queryKey, queryFn: fetch, retry: false, staleTime: 5 * 60_000 });

  // AI-backed and optional by design: render nothing while loading, on error
  // (e.g. AI disabled server-side) or when the backend has nothing to suggest
  if (!rail.data?.length) return null;

  return (
    <section className="section" key={productId}>
      <div className="railHeader">
        <h2 className="title">{title}</h2>
      </div>
      <div className="grid">
        {rail.data.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function hasStock(variants: Variant[], size: string) {
  return variants.some((variant) => variant.size === size && (variant.available ?? 0) > 0);
}
