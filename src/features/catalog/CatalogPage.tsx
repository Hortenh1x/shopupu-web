"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogApi } from "@/lib/api/shop";

type FilterState = {
  q: string;
  category: string;
  brand: string;
  gender: string;
  size: string;
  color: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
};

const GENDERS = ["MEN", "WOMEN", "UNISEX", "KIDS"];

export function CatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const brands = useQuery({ queryKey: ["brands"], queryFn: catalogApi.brands });
  const searchKey = searchParams.toString();
  const [filters, setFilters] = useState<FilterState>(() => readFilters(searchParams));

  useEffect(() => {
    setFilters(readFilters(new URLSearchParams(searchKey)));
  }, [searchKey]);

  const page = Math.max(Number(searchParams.get("page") ?? "1") - 1, 0);
  const applied = readFilters(searchParams);

  const products = useQuery({
    queryKey: ["catalog", searchKey],
    queryFn: () =>
      catalogApi.search({
        q: applied.q || undefined,
        categoryId: applied.category ? Number(applied.category) : undefined,
        brandId: applied.brand ? Number(applied.brand) : undefined,
        gender: applied.gender || undefined,
        size: applied.size || undefined,
        color: applied.color || undefined,
        minPrice: applied.minPrice || undefined,
        maxPrice: applied.maxPrice || undefined,
        inStock: applied.inStock || undefined,
        page,
        pageSize: 12,
        sort: applied.sort
      })
  });

  function setFilter<K extends keyof FilterState>(name: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (filters.q.trim()) next.set("q", filters.q.trim());
    if (filters.category) next.set("category", filters.category);
    if (filters.brand) next.set("brand", filters.brand);
    if (filters.gender) next.set("gender", filters.gender);
    if (filters.size.trim()) next.set("size", filters.size.trim());
    if (filters.color.trim()) next.set("color", filters.color.trim());
    if (filters.minPrice.trim()) next.set("minPrice", filters.minPrice.trim());
    if (filters.maxPrice.trim()) next.set("maxPrice", filters.maxPrice.trim());
    if (filters.inStock) next.set("inStock", "true");
    if (filters.sort) next.set("sort", filters.sort);
    next.set("page", "1");
    router.push(`/catalog?${next.toString()}`);
  }

  return (
    <main className="page">
      <section className="stack">
        <h1 className="title">Catalog</h1>
        <form onSubmit={applyFilters} className="card toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label">
            Search
            <input className="input" value={filters.q} onChange={(e) => setFilter("q", e.target.value)} />
          </label>
          <label className="label">
            Category
            <select className="select" value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
              <option value="">All</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Brand
            <select className="select" value={filters.brand} onChange={(e) => setFilter("brand", e.target.value)}>
              <option value="">All</option>
              {brands.data?.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Gender
            <select className="select" value={filters.gender} onChange={(e) => setFilter("gender", e.target.value)}>
              <option value="">All</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Size
            <input className="input" placeholder="M" value={filters.size} onChange={(e) => setFilter("size", e.target.value)} style={{ width: 80 }} />
          </label>
          <label className="label">
            Color
            <input className="input" placeholder="black" value={filters.color} onChange={(e) => setFilter("color", e.target.value)} style={{ width: 110 }} />
          </label>
          <label className="label">
            Min price
            <input className="input" value={filters.minPrice} onChange={(e) => setFilter("minPrice", e.target.value)} inputMode="decimal" style={{ width: 90 }} />
          </label>
          <label className="label">
            Max price
            <input className="input" value={filters.maxPrice} onChange={(e) => setFilter("maxPrice", e.target.value)} inputMode="decimal" style={{ width: 90 }} />
          </label>
          <label className="label">
            In stock
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => setFilter("inStock", e.target.checked)}
              style={{ width: 22, height: 22 }}
            />
          </label>
          <label className="label">
            Sort
            <select className="select" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
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
        ) : products.error ? (
          <p className="muted">{(products.error as Error).message}</p>
        ) : (
          <>
            <div className="grid">
              {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {!products.data?.content?.length ? <p className="muted">Nothing matches these filters.</p> : null}
            <Pagination page={products.data?.number ?? 0} totalPages={products.data?.totalPages ?? 0} />
          </>
        )}
      </section>
    </main>
  );
}

function readFilters(searchParams: { get: (name: string) => string | null }): FilterState {
  return {
    q: searchParams.get("q") ?? "",
    category: searchParams.get("category") ?? "",
    brand: searchParams.get("brand") ?? "",
    gender: searchParams.get("gender") ?? "",
    size: searchParams.get("size") ?? "",
    color: searchParams.get("color") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    inStock: searchParams.get("inStock") === "true",
    sort: searchParams.get("sort") ?? "createdAt,desc"
  };
}
