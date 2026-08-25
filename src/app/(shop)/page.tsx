"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogApi } from "@/lib/api/shop";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HomePage() {
  const products = useQuery({ queryKey: ["home-products"], queryFn: () => catalogApi.products(0, 8) });

  return (
    <main className="page">
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
