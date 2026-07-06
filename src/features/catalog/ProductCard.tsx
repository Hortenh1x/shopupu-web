import Link from "next/link";
import type { Product, ProductListItem } from "@/lib/api/types";

type ProductCardProduct = Product | ProductListItem;

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const preview = getPreviewImage(product);

  return (
    <article className="card stack">
      <Link href={`/products/${product.id}`} style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            aspectRatio: "4 / 3",
            border: "1px solid var(--color-border-soft)",
            borderRadius: 14,
            background: preview.url
              ? `center / cover no-repeat url(${preview.url})`
              : "linear-gradient(135deg, var(--color-concrete), var(--color-paper))"
          }}
          aria-label={preview.altText ?? product.title}
        />
        <div className="stack" style={{ gap: 6 }}>
          {product.brandName ? <span className="status">{product.brandName}</span> : null}
          <h2 style={{ margin: 0, fontSize: "1.25rem", letterSpacing: "-0.015em" }}>{product.title}</h2>
          <span>
            <strong>{Number(product.price).toFixed(2)} EUR</strong>{" "}
            {product.oldPrice ? (
              <span className="muted" style={{ textDecoration: "line-through" }}>
                {Number(product.oldPrice).toFixed(2)} EUR
              </span>
            ) : null}
          </span>
          {"gender" in product && product.gender ? <span className="muted">{product.gender.toLowerCase()}</span> : null}
        </div>
      </Link>
    </article>
  );
}

function getPreviewImage(product: ProductCardProduct) {
  if (isFullProduct(product)) {
    return {
      url: product.images?.[0]?.url,
      altText: product.images?.[0]?.altText
    };
  }

  return {
    url: product.imageUrl,
    altText: product.imageAltText
  };
}

function isFullProduct(product: ProductCardProduct): product is Product {
  return "images" in product;
}
