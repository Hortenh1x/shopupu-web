"use client";

import Link from "next/link";
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
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const brands = useQuery({ queryKey: ["brands"], queryFn: catalogApi.brands });

  const styleCount = products.data?.totalElements;
  const brandCount = brands.data?.length;
  const categoryCount = categories.data?.length;

  return (
    <main className="page">
      <section className="panelTangerine" style={{ padding: "clamp(32px, 6vw, 72px)" }}>
        <div className="stack" style={{ gap: 22, justifyItems: "start", maxWidth: 760 }}>
          <span className="kicker onDark">Portfolio demo &middot; a real store, end to end</span>
          <h1 className="headline">
            A working store, <span className="mark">front to back</span>.
          </h1>
          <p className="subhead" style={{ color: "color-mix(in oklab, var(--cream-on-dark) 88%, transparent)" }}>
            Shopupu is a full-stack e-commerce demo: a Spring Boot API with live inventory, guest carts,
            payments and moderated reviews — plus semantic search and an AI stylist. Everything on this
            site actually works.
          </p>
          <div className="toolbar">
            <Link className="button buttonDark" href="/catalog">
              Browse the catalog
            </Link>
            <a className="button" href="https://github.com/Hortenh1x/shopupu" target="_blank" rel="noreferrer">
              View the code
            </a>
          </div>
        </div>
        {styleCount || brandCount || categoryCount ? (
          <div
            className="toolbar"
            style={{
              marginTop: "clamp(28px, 4vw, 48px)",
              paddingTop: 22,
              borderTop: "1px solid color-mix(in oklab, var(--cream-on-dark) 30%, transparent)",
              gap: "clamp(24px, 6vw, 72px)"
            }}
          >
            {[
              { value: styleCount, label: "styles in stock" },
              { value: brandCount, label: "brands" },
              { value: categoryCount, label: "categories" }
            ]
              .filter((stat) => stat.value)
              .map((stat) => (
                <div key={stat.label} className="stack" style={{ gap: 2 }}>
                  <span className="price" style={{ fontSize: "1.6rem" }}>
                    {stat.value}
                  </span>
                  <span className="kicker onDark">{stat.label}</span>
                </div>
              ))}
          </div>
        ) : null}
      </section>

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

      {categories.data?.length ? (
        <section className="section">
          <div className="railHeader">
            <h2 className="title">
              Shop by <span className="mark">category</span>.
            </h2>
          </div>
          <div className="chipRow">
            {categories.data.map((category) => (
              <Link key={category.id} className="chip" href={`/catalog?category=${category.id}`}>
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="railHeader">
          <h2 className="title">New this week.</h2>
          <p className="muted" style={{ margin: 0 }}>
            Straight from the catalog API — stock per size and color is live from the inventory service.
          </p>
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
