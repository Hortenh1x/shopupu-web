import Link from "next/link";
import type { Product, ProductListItem } from "@/lib/api/types";

type ProductCardProduct = Product | ProductListItem;

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const preview = getPreviewImage(product);
  const onSale = product.oldPrice != null && Number(product.oldPrice) > Number(product.price);

  return (
    <article className="productCard">
      <Link href={`/products/${product.id}`} style={{ display: "contents" }}>
        <div className="productMedia">
          {preview.url ? (
            <img src={preview.url} alt={preview.altText ?? product.title} loading="lazy" />
          ) : (
            <span className="placeholder" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M8 4l-5 4 2.5 3L8 9.5V20h8V9.5l2.5 1.5L21 8l-5-4a4 4 0 0 1-8 0Z" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          {onSale ? <span className="badgeSale">Sale</span> : null}
        </div>
        <div className="productBody">
          <span className="kicker">
            {[product.brandName, "gender" in product && product.gender ? product.gender.toLowerCase() : null]
              .filter(Boolean)
              .join(" · ") || "shopupu"}
          </span>
          <h3 className="productTitle">{product.title}</h3>
          <span style={{ display: "inline-flex", gap: 10, alignItems: "baseline" }}>
            <span className="price">{formatPrice(product.price)}</span>
            {onSale ? <span className="priceOld">{formatPrice(product.oldPrice!)}</span> : null}
          </span>
        </div>
      </Link>
    </article>
  );
}

export function formatPrice(value: number | string) {
  return `€${Number(value).toFixed(2)}`;
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
