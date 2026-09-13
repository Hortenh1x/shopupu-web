import { cache } from "react";
import { notFound } from "next/navigation";
import type { Product } from "@/lib/api/types";

const baseUrl = process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const getServerProduct = cache(async (id: string): Promise<Product> => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const response = await fetch(`${baseUrl}/api/v1/catalog/products/${id}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("The catalog is temporarily unavailable. Please try again.");
  const product = await response.json() as Product;
  if (!product.enabled) notFound();
  return product;
});
