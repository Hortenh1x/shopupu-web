"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingStars } from "@/components/ui/RatingStars";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/features/catalog/ProductCard";
import { ReviewPanel } from "@/features/reviews/ReviewPanel";
import { aiApi, cartApi, catalogApi, userApi } from "@/lib/api/shop";
import type { Product, ProductListItem, Variant } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

function sizeRank(size: string) {
  const index = SIZE_ORDER.indexOf(size.toUpperCase());
  return index === -1 ? SIZE_ORDER.length + size.charCodeAt(0) : index;
}

export function ProductDetails({ productId, initialProduct }: { productId: number; initialProduct?: Product }) {
  const { t, formatPrice, formatNumber, genderLabel, errorMessage } = useI18n();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const product = useQuery({ queryKey: ["product", productId], queryFn: () => catalogApi.product(productId), initialData: initialProduct });
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

  const addToCart = useSessionMutation({
    mutationFn: () => cartApi.add(selected!.id, quantity),
    // the reply is the whole cart: writing it to the shared entry updates the
    // header badge at once, even for a guest whose cart token was just created
    onSuccess: (updated) => queryClient.setQueryData(["cart", auth.user?.id ?? "guest"], updated)
  });
  const wishlist = useSessionMutation({
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
        <EmptyState title={t("product.loadTitle")} body={t("product.loadBody")}>
          <button className="button" onClick={() => product.refetch()}>{t("common.retry")}</button>
          <Link className="button buttonDark" href="/catalog">
            {t("nav.backCatalog")}
          </Link>
        </EmptyState>
      </main>
    );
  }

  const current = product.data;
  const images = current.images ?? [];
  const image = images[activeImage] ?? images[0];

  function chooseColor(next: string) {
    setSelectedColor(next);
    setQuantity(1);
    // a gallery captioned per colour follows the chip; single-image products keep the photo
    const captioned = images.findIndex((img) => next && img.altText?.toLowerCase().includes(next.toLowerCase()));
    if (captioned >= 0) setActiveImage(captioned);
  }
  const displayPrice = selected?.price ?? current.price;
  const displayOldPrice = selected?.oldPrice ?? current.oldPrice;
  const onSale = displayOldPrice != null && Number(displayOldPrice) > Number(displayPrice);
  const meta = [current.gender ? genderLabel(current.gender) : null, current.season, current.material]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="page">
      <section className="split">
        <div className="stack" style={{ gap: 12 }}>
          <div className="productMedia" style={{ borderRadius: "var(--radius-panel)", border: "1px solid var(--line)" }}>
            {image?.url ? (
              images.map((img, index) => (
                <div key={img.id} className="mediaLayer" data-active={img.id === image.id} aria-hidden={img.id !== image.id}>
                  <img
                    src={img.url}
                    alt={img.id === image.id ? (img.altText ?? current.title) : ""}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))
            ) : (
              <span className="placeholder" aria-hidden="true">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M8 4l-5 4 2.5 3L8 9.5V20h8V9.5l2.5 1.5L21 8l-5-4a4 4 0 0 1-8 0Z" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            {onSale ? <span className="badgeSale">{t("product.sale")}</span> : null}
          </div>
          {images.length > 1 ? (
            <div className="toolbar" style={{ gap: 8 }}>
              {images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(index)}
                  aria-label={img.altText ?? t("product.image", { number: index + 1 })}
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

        <aside className="card stack" style={{ position: "sticky", top: 84, padding: 24, gap: 16 }}>
          <span className="kicker">
            {[current.brandName, current.categoryName].filter(Boolean).join(" · ") || t("nav.catalog")}
          </span>
          <h1 className="title">{current.title}</h1>
          <p className="status statusWarn">{t("product.fictional")}</p>
          {rating.data && rating.data.reviewCount > 0 ? (
            <span className="toolbar" style={{ gap: 8 }}>
              <RatingStars value={Number(rating.data.averageRating)} />
              <span className="mono muted" style={{ fontSize: "0.85rem" }}>
                {t(rating.data.reviewCount === 1 ? "product.reviewsOne" : "product.reviewsMany", { rating: formatNumber(Number(rating.data.averageRating), { minimumFractionDigits: 1, maximumFractionDigits: 1 }), count: formatNumber(rating.data.reviewCount) })}
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
                <span className="kicker">{t("catalog.size")}</span>
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
                  <span className="kicker">{t("catalog.color")}</span>
                  <div className="chipRow">
                    {colors.map((c) => {
                      const variant = variants.find((v) => v.size === size && (v.color ?? "") === c);
                      const out = (variant?.available ?? 0) <= 0;
                      const swatch = swatchColor(c);
                      return (
                        <button
                          key={c || "one-color"}
                          type="button"
                          className="chip"
                          data-selected={c === color}
                          disabled={out}
                          onClick={() => chooseColor(c)}
                        >
                          {swatch ? <span className="chipSwatch" style={{ background: swatch }} aria-hidden /> : null}
                          {c || t("product.oneColor")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <p className="mono muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                {selected ? `SKU ${selected.sku}` : ""}
                {selected ? " · " : ""}
                {available > 0 ? t("product.inStock", { count: formatNumber(available) }) : t("product.outOfStock")}
              </p>

              <div className="toolbar" style={{ gap: 12 }}>
                <div className="qty">
                  <button
                    type="button"
                    aria-label={t("product.decrease")}
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    &minus;
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    aria-label={t("product.increase")}
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
                  {addToCart.isPending ? t("product.adding") : t("product.addCart")}
                </button>
              </div>
              {addToCart.isSuccess ? (
                <p className="statusOk status" style={{ margin: 0 }}>
                  {t("product.added")} ·{" "}
                  <Link href="/cart" style={{ textDecoration: "underline" }}>
                    {t("product.viewCart")}
                  </Link>
                </p>
              ) : null}
              {addToCart.error ? <p className="errorText">{errorMessage(addToCart.error)}</p> : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {t("product.noVariants")}
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
              {wishlist.isSuccess ? t("product.saved") : t("product.wishlist")}
            </button>
          ) : null}
          {wishlist.error ? <p className="errorText" role="alert">{errorMessage(wishlist.error)}</p> : null}
          {current.careInstructions ? (
            <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
              {t("product.care", { instructions: current.careInstructions })}
            </p>
          ) : null}
        </aside>
      </section>

      <RecommendationRail
        title={t("product.similar")}
        productId={productId}
        fetch={() => aiApi.similar(productId, 4)}
        queryKey={["similar", productId]}
      />

      <ReviewPanel productId={productId} />

      <RecommendationRail
        title={t("product.together")}
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

// swatch colours for the variant names the catalog uses; unknown names get no dot.
// A static table (not CSS.supports) keeps server and client markup identical.
const SWATCHES: Record<string, string> = {
  black: "#1c1c1c", white: "#f5f3ee", grey: "#8a8a8a", gray: "#8a8a8a", charcoal: "#3b3b3b", silver: "#c4c4c4",
  navy: "#1f2a44", blue: "#2f5fa8", denim: "#3b5a86", teal: "#2f7f7a", green: "#3f6b3a", olive: "#6b6b2f", khaki: "#b9a77a", mint: "#9fd3c0",
  beige: "#d8c7a6", cream: "#f1e7cf", ivory: "#f4efe1", sand: "#d2b48c", tan: "#c9a173", camel: "#b6864b", brown: "#6b4a2b",
  red: "#b3261e", burgundy: "#6d1f2c", maroon: "#6d1f2c", pink: "#e8a4b8", coral: "#f08070", orange: "#e0521a",
  yellow: "#f2c545", mustard: "#c99a2e", gold: "#d4af37", purple: "#6b4a8a", lavender: "#b8a9d9"
};

function swatchColor(name: string) {
  const value = name.trim().toLowerCase();
  if (!value) return null;
  const key = SWATCHES[value] ? value : Object.keys(SWATCHES).find((known) => value.split(/[\s/-]+/).includes(known));
  return key ? SWATCHES[key] : null;
}

function hasStock(variants: Variant[], size: string) {
  return variants.some((variant) => variant.size === size && (variant.available ?? 0) > 0);
}
