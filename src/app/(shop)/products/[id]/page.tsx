import { ProductDetails } from "@/features/catalog/ProductDetails";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetails productId={Number(id)} />;
}
