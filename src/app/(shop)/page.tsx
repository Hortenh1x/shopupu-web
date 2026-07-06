"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogApi } from "@/lib/api/shop";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HomePage() {
  const products = useQuery({ queryKey: ["home-products"], queryFn: () => catalogApi.products(0, 8) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });

  return (
    <main className="page">
      <section className="brutal" style={{ padding: 28 }}>
        <p className="status">clothing store</p>
        <h1 className="headline">shopupu</h1>
        <p className="subhead">
          Clothing catalog with size and color variants, live stock, guest cart, promo codes and verified reviews.
        </p>
        <div className="toolbar">
          <Link className="button buttonDark" href="/catalog">
            Open catalog
          </Link>
          <Link className="button" href="/register">
            Create account
          </Link>
        </div>
      </section>

      {categories.data?.length ? (
        <section className="section">
          <h2 className="title">Categories</h2>
          <div className="toolbar" style={{ flexWrap: "wrap" }}>
            {categories.data.map((category) => (
              <Link key={category.id} className="button" href={`/catalog?category=${category.id}`}>
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="title">Latest arrivals</h2>
        {products.isLoading ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} />
            ))}
          </div>
        ) : products.error ? (
          <p className="muted">{(products.error as Error).message}</p>
        ) : (
          <div className="grid">
            {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
