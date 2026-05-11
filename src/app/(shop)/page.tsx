"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogApi } from "@/lib/api/shop";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HomePage() {
  const params = new URLSearchParams({ enabled: "true", size: "8", page: "0", sort: "createdAt,desc" });
  const products = useQuery({ queryKey: ["home-products"], queryFn: () => catalogApi.products(params) });

  return (
    <main className="page">
      <section className="brutal" style={{ padding: 28 }}>
        <p className="status">catalog first</p>
        <h1 className="headline">shopupu</h1>
        <p className="subhead">
          Minimal ecommerce shell with concrete grids, bank-app payments, reviews, cart, checkout and admin operations.
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

      <section className="section">
        <h2 className="title">Latest goods</h2>
        {products.isLoading ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid">
            {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
