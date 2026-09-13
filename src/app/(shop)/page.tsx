"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogApi } from "@/lib/api/shop";
import { Skeleton } from "@/components/ui/Skeleton";

export default function HomePage() {
  const { t, errorMessage } = useI18n();
  const products = useQuery({ queryKey: ["home-products"], queryFn: () => catalogApi.products(0, 8) });

  return (
    <main className="page">
      <section className="section">
        <div className="railHeader">
          <h2 className="title">{t("home.new")}</h2>
        </div>
        {products.isLoading ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} variant="product" />
            ))}
          </div>
        ) : products.error ? (
          <p className="errorText">{errorMessage(products.error)}</p>
        ) : (
          <div className="grid">
            {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
