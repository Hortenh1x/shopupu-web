"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
  const { t, genderLabel, formatNumber, errorMessage } = useI18n();
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
    // the previous results stay on screen (dimmed) while a filter or page change loads
    placeholderData: keepPreviousData,
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

  // selects, chips and toggles answer on the spot; typed fields wait for Enter/Search
  function chooseFilter<K extends keyof FilterState>(name: K, value: FilterState[K]) {
    const next = { ...filters, [name]: value };
    setFilters(next);
    commitFilters(next, { replace: true });
  }

  function applyFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    commitFilters(filters);
  }

  function commitFilters(state: FilterState, { replace = false } = {}) {
    const next = new URLSearchParams();
    if (state.q.trim()) next.set("q", state.q.trim());
    if (state.ai && state.q.trim()) {
      next.set("ai", "1");
    } else {
      if (state.category) next.set("category", state.category);
      if (state.brand) next.set("brand", state.brand);
      if (state.gender) next.set("gender", state.gender);
      if (state.size.trim()) next.set("size", state.size.trim());
      if (state.color.trim()) next.set("color", state.color.trim());
      if (state.minPrice.trim()) next.set("minPrice", state.minPrice.trim());
      if (state.maxPrice.trim()) next.set("maxPrice", state.maxPrice.trim());
      if (state.inStock) next.set("inStock", "true");
      if (state.sort !== "createdAt,desc") next.set("sort", state.sort);
    }
    next.set("page", "1");
    const href = `/catalog?${next.toString()}`;
    // a chip toggle refines the current view: no history entry, no jump to the top
    if (replace) router.replace(href, { scroll: false });
    else router.push(href);
  }

  const hasActiveFilters = searchKey !== "" && searchKey !== "page=1";
  const totalElements = products.data?.totalElements;

  return (
    <main className="page">
      <div className="railHeader">
        <h1 className="title">{t("nav.catalog")}</h1>
        {totalElements != null ? (
          <span className="mono muted" style={{ fontSize: "0.88rem", justifySelf: "end" }}>
            {t(totalElements === 1 ? "catalog.countOne" : "catalog.countMany", { count: formatNumber(totalElements) })}
          </span>
        ) : null}
      </div>

      <form onSubmit={applyFilters} className="card stack" style={{ gap: 16 }}>
        <div className="toolbar" style={{ alignItems: "center" }}>
          <input
            className="input"
            style={{ flex: "1 1 260px" }}
            placeholder={filters.ai ? t("catalog.smartPlaceholder") : t("catalog.searchPlaceholder")}
            aria-label={t("catalog.search")}
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
          />
          <button
            type="button"
            className="chip"
            data-selected={filters.ai}
            onClick={() => chooseFilter("ai", !filters.ai)}
            title={t("catalog.smartTitle")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 1c.62 5.9 4.28 9.56 11 11-6.72 1.44-10.38 5.1-11 11-.62-5.9-4.28-9.56-11-11 6.72-1.44 10.38-5.1 11-11Z" />
            </svg>
            {t("catalog.smart")}
          </button>
          <button className="button buttonDark" type="submit">
            {t("catalog.search")}
          </button>
        </div>

        <fieldset
          disabled={filters.ai}
          style={{
            border: 0,
            margin: 0,
            padding: 0,
            display: "grid",
            gap: 16,
            opacity: filters.ai ? 0.45 : 1,
            transition: "opacity 160ms var(--ease-out)"
          }}
        >
          <div className="toolbar" style={{ alignItems: "end" }}>
            <label className="label" style={{ flex: "1 1 150px" }}>
              {t("catalog.category")}
              <select className="select" value={filters.category} onChange={(e) => chooseFilter("category", e.target.value)}>
                <option value="">{t("catalog.all")}</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label" style={{ flex: "1 1 150px" }}>
              {t("catalog.brand")}
              <select className="select" value={filters.brand} onChange={(e) => chooseFilter("brand", e.target.value)}>
                <option value="">{t("catalog.all")}</option>
                {brands.data?.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label" style={{ flex: "1 1 130px" }}>
              {t("catalog.gender")}
              <select className="select" value={filters.gender} onChange={(e) => chooseFilter("gender", e.target.value)}>
                <option value="">{t("catalog.all")}</option>
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {genderLabel(gender)}
                  </option>
                ))}
              </select>
            </label>
            <label className="label" style={{ flex: "1 1 130px" }}>
              {t("catalog.sort")}
              <select className="select" value={filters.sort} onChange={(e) => chooseFilter("sort", e.target.value)}>
                <option value="createdAt,desc">{t("catalog.newest")}</option>
                <option value="title,asc">{t("catalog.name")}</option>
                <option value="price,asc">{t("catalog.priceLow")}</option>
                <option value="price,desc">{t("catalog.priceHigh")}</option>
              </select>
            </label>
          </div>

          <div className="toolbar" style={{ alignItems: "end", rowGap: 16 }}>
            <div className="stack" style={{ gap: 8 }}>
              <span className="kicker">{t("catalog.size")}</span>
              <div className="chipRow">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    data-selected={filters.size === s}
                    onClick={() => chooseFilter("size", filters.size === s ? "" : s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="label" style={{ width: 120 }}>
              {t("catalog.color")}
              <input className="input" placeholder={t("catalog.colorPlaceholder")} value={filters.color} onChange={(e) => setFilter("color", e.target.value)} />
            </label>
            <label className="label" style={{ width: 104 }}>
              {t("catalog.min")}
              <input className="input" value={filters.minPrice} onChange={(e) => setFilter("minPrice", e.target.value)} inputMode="decimal" />
            </label>
            <label className="label" style={{ width: 104 }}>
              {t("catalog.max")}
              <input className="input" value={filters.maxPrice} onChange={(e) => setFilter("maxPrice", e.target.value)} inputMode="decimal" />
            </label>
            <label className="checkboxRow" style={{ paddingBottom: 10 }}>
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => chooseFilter("inStock", e.target.checked)}
              />
              {t("catalog.stockOnly")}
            </label>
          </div>
        </fieldset>

        {hasActiveFilters ? (
          <div>
            <Link className="muted" style={{ fontSize: "0.88rem", textDecoration: "underline" }} href="/catalog">
              {t("catalog.resetAll")}
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
          <p className="errorText">{errorMessage(products.error)}</p>
        ) : (
          <>
            <div className="grid" data-busy={products.isPlaceholderData} aria-busy={products.isPlaceholderData}>
              {products.data?.content?.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {!products.data?.content?.length ? (
              <div className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start" }}>
                <h2 className="subtitle" style={{ margin: 0 }}>
                  {t("catalog.empty")}
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  {t(aiApplied ? "catalog.emptySmartHint" : "catalog.emptyHint")}
                </p>
                <Link className="button" href="/catalog">
                  {t("catalog.reset")}
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
