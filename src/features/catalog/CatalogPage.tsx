"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/features/catalog/ProductCard";
import { aiApi, catalogApi } from "@/lib/api/shop";

type FilterState = {
  q: string;
  ai: boolean;
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
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

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
  const aiApplied = applied.ai && Boolean(applied.q);

  const products = useQuery({
    queryKey: ["catalog", searchKey],
    queryFn: () =>
      aiApplied
        ? // natural-language mode: the backend parses the query into filters
          // (and falls back to plain keyword search when AI is off)
          aiApi.nlSearch(applied.q, page, 12)
        : catalogApi.search({
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

  function applyFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const next = new URLSearchParams();
    if (filters.q.trim()) next.set("q", filters.q.trim());
    if (filters.ai && filters.q.trim()) {
      next.set("ai", "1");
    } else {
      if (filters.category) next.set("category", filters.category);
      if (filters.brand) next.set("brand", filters.brand);
      if (filters.gender) next.set("gender", filters.gender);
      if (filters.size.trim()) next.set("size", filters.size.trim());
      if (filters.color.trim()) next.set("color", filters.color.trim());
      if (filters.minPrice.trim()) next.set("minPrice", filters.minPrice.trim());
      if (filters.maxPrice.trim()) next.set("maxPrice", filters.maxPrice.trim());
      if (filters.inStock) next.set("inStock", "true");
      if (filters.sort !== "createdAt,desc") next.set("sort", filters.sort);
    }
    next.set("page", "1");
    router.push(`/catalog?${next.toString()}`);
  }

  const hasActiveFilters = searchKey !== "" && searchKey !== "page=1";
  const totalElements = products.data?.totalElements;

  return (
    <main className="page">
      <div className="railHeader">
        <h1 className="title">Catalog</h1>
        {totalElements != null ? (
          <span className="mono muted" style={{ fontSize: "0.88rem", justifySelf: "end" }}>
            {totalElements} style{totalElements === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <form onSubmit={applyFilters} className="card stack" style={{ gap: 16 }}>
        <div className="toolbar" style={{ alignItems: "center" }}>
          <input
            className="input"
            style={{ flex: "1 1 260px" }}
            placeholder={filters.ai ? "Try: warm jacket for men under 100" : "Search the catalog"}
            aria-label="Search"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
          />
          <button
            type="button"
            className="chip"
            data-selected={filters.ai}
            onClick={() => setFilter("ai", !filters.ai)}
            title="Describe what you need in plain words; the shop parses it into filters"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 1c.62 5.9 4.28 9.56 11 11-6.72 1.44-10.38 5.1-11 11-.62-5.9-4.28-9.56-11-11 6.72-1.44 10.38-5.1 11-11Z" />
            </svg>
            Smart search
          </button>
          <button className="button buttonDark" type="submit">
            Search
          </button>
        </div>

        <fieldset
          disabled={filters.ai}
          style={{
            border: 0,
            margin: 0,
            padding: 0,
            display: "grid",
            gap: 14,
            opacity: filters.ai ? 0.45 : 1,
            transition: "opacity 160ms var(--ease-out)"
          }}
        >
          <div className="toolbar" style={{ alignItems: "end" }}>
            <label className="label" style={{ flex: "1 1 150px" }}>
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
            <label className="label" style={{ flex: "1 1 150px" }}>
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
            <label className="label" style={{ flex: "1 1 130px" }}>
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
            <label className="label" style={{ flex: "1 1 130px" }}>
              Sort
              <select className="select" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
                <option value="createdAt,desc">Newest</option>
                <option value="title,asc">Name A-Z</option>
                <option value="price,asc">Price low</option>
                <option value="price,desc">Price high</option>
              </select>
            </label>
          </div>

          <div className="toolbar" style={{ alignItems: "end", rowGap: 14 }}>
            <div className="stack" style={{ gap: 7 }}>
              <span className="kicker">Size</span>
              <div className="chipRow">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    data-selected={filters.size === s}
                    onClick={() => setFilter("size", filters.size === s ? "" : s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="label" style={{ width: 120 }}>
              Color
              <input className="input" placeholder="black" value={filters.color} onChange={(e) => setFilter("color", e.target.value)} />
            </label>
            <label className="label" style={{ width: 104 }}>
              Min &euro;
              <input className="input" value={filters.minPrice} onChange={(e) => setFilter("minPrice", e.target.value)} inputMode="decimal" />
            </label>
            <label className="label" style={{ width: 104 }}>
              Max &euro;
              <input className="input" value={filters.maxPrice} onChange={(e) => setFilter("maxPrice", e.target.value)} inputMode="decimal" />
            </label>
            <label className="checkboxRow" style={{ paddingBottom: 10 }}>
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => setFilter("inStock", e.target.checked)}
              />
              In stock only
            </label>
          </div>
        </fieldset>

        {hasActiveFilters ? (
          <div>
            <Link className="muted" style={{ fontSize: "0.88rem", textDecoration: "underline" }} href="/catalog">
              Reset everything
            </Link>
          </div>
        ) : null}
      </form>

      <section className="section" style={{ marginTop: 28 }}>
        {products.isLoading ? (
          <div className="grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} variant="product" />
            ))}
          </div>
        ) : products.error ? (
          <p className="errorText">{(products.error as Error).message}</p>
        ) : (
          <>
            <div className="grid">
              {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {!products.data?.content?.length ? (
              <div className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start" }}>
                <h2 className="subtitle" style={{ margin: 0 }}>
                  Nothing matches these filters.
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  Try a broader search{aiApplied ? " or switch smart search off" : ""}.
                </p>
                <Link className="button" href="/catalog">
                  Reset filters
                </Link>
              </div>
            ) : null}
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
    ai: searchParams.get("ai") === "1",
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
