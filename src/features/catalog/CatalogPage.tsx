"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogApi } from "@/lib/api/shop";

type CatalogFilters = {
  query: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

export function CatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const searchKey = searchParams.toString();
  const [filters, setFilters] = useState<CatalogFilters>(() => readFilters(searchParams));

  useEffect(() => {
    setFilters(readFilters(new URLSearchParams(searchKey)));
  }, [searchKey]);

  const apiParams = new URLSearchParams();
  apiParams.set("page", String(Math.max(Number(searchParams.get("page") ?? "1") - 1, 0)));
  apiParams.set("size", searchParams.get("size") ?? "12");
  apiParams.set("sort", searchParams.get("sort") ?? "createdAt,desc");
  apiParams.set("enabled", "true");
  if (searchParams.get("query")) apiParams.set("q", searchParams.get("query")!);
  if (searchParams.get("category")) apiParams.set("categoryId", searchParams.get("category")!);
  if (searchParams.get("minPrice")) apiParams.set("minPrice", searchParams.get("minPrice")!);
  if (searchParams.get("maxPrice")) apiParams.set("maxPrice", searchParams.get("maxPrice")!);

  const products = useQuery({
    queryKey: ["catalog", apiParams.toString()],
    queryFn: () => catalogApi.products(apiParams)
  });

  function setFilter(name: keyof CatalogFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function updateFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (filters.query.trim()) next.set("query", filters.query.trim());
    if (filters.category) next.set("category", filters.category);
    if (filters.minPrice.trim()) next.set("minPrice", filters.minPrice.trim());
    if (filters.maxPrice.trim()) next.set("maxPrice", filters.maxPrice.trim());
    if (filters.sort) next.set("sort", filters.sort);
    next.set("page", "1");
    router.push(`/catalog?${next.toString()}`);
  }

  return (
    <main className="page">
      <section className="stack">
        <h1 className="title">Catalog</h1>
        <form onSubmit={updateFilter} className="card toolbar">
          <label className="label">
            Search
            <input className="input" name="query" value={filters.query} onChange={(event) => setFilter("query", event.target.value)} />
          </label>
          <label className="label">
            Category
            <select className="select" name="category" value={filters.category} onChange={(event) => setFilter("category", event.target.value)}>
              <option value="">All</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Min price
            <input className="input" name="minPrice" value={filters.minPrice} onChange={(event) => setFilter("minPrice", event.target.value)} inputMode="decimal" />
          </label>
          <label className="label">
            Max price
            <input className="input" name="maxPrice" value={filters.maxPrice} onChange={(event) => setFilter("maxPrice", event.target.value)} inputMode="decimal" />
          </label>
          <label className="label">
            Sort
            <select className="select" name="sort" value={filters.sort} onChange={(event) => setFilter("sort", event.target.value)}>
              <option value="createdAt,desc">Newest</option>
              <option value="title,asc">Name A-Z</option>
              <option value="price,asc">Price low</option>
              <option value="price,desc">Price high</option>
            </select>
          </label>
          <button className="button buttonDark">Apply</button>
        </form>
      </section>

      <section className="section">
        {products.isLoading ? (
          <div className="grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid">
              {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <Pagination page={products.data?.number ?? 0} totalPages={products.data?.totalPages ?? 0} />
          </>
        )}
      </section>
    </main>
  );
}

function readFilters(searchParams: { get: (name: string) => string | null }): CatalogFilters {
  return {
    query: searchParams.get("query") ?? "",
    category: searchParams.get("category") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    sort: searchParams.get("sort") ?? "createdAt,desc"
  };
}
