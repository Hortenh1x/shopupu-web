import { redirect } from "next/navigation";
import { apiBaseUrl } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";

export default async function CategoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let category: Category | null = null;
  try {
    const response = await fetch(`${apiBaseUrl}/api/catalog/categories/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (response.ok) {
      category = (await response.json()) as Category;
    }
  } catch {
    category = null;
  }
  if (category) {
    redirect(`/catalog?category=${category.id}`);
  }
  redirect(`/catalog?query=${encodeURIComponent(slug)}`);
}
