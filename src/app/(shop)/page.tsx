"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogApi } from "@/lib/api/shop";
import { Skeleton } from "@/components/ui/Skeleton";

const MARQUEE_ITEMS = [
  "Semantic search on pgvector",
  "AI stylist backed by a real LLM",
  "Guest cart merges on sign-in",
  "Idempotent checkout, 9-status order flow",
  "HMAC-verified payment webhooks",
  "Google sign-in, JWT with rotation"
];

export default function HomePage() {
  const products = useQuery({ queryKey: ["home-products"], queryFn: () => catalogApi.products(0, 8) });

  return (
    <main className="page">
      <div className="marquee" aria-hidden="true">
        <div className="marqueeTrack">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
            <span key={index}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="spark" aria-hidden="true">
                <path d="M12 1c.62 5.9 4.28 9.56 11 11-6.72 1.44-10.38 5.1-11 11-.62-5.9-4.28-9.56-11-11 6.72-1.44 10.38-5.1 11-11Z" />
              </svg>
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="railHeader">
          <h2 className="title">New this week.</h2>
        </div>
        {products.isLoading ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} variant="product" />
            ))}
          </div>
        ) : products.error ? (
          <p className="errorText">{(products.error as Error).message}</p>
        ) : (
          <div className="grid">
            {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
