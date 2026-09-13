import { ProductDetails } from "@/features/catalog/ProductDetails";
import { getServerI18n } from "@/lib/i18n/server";
import { getServerProduct } from "@/lib/api/serverCatalog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getServerProduct(id);
  const { t } = await getServerI18n();
  return { title: t("demo.productTitle", { title: product.title }) };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getServerProduct(id);
  return <ProductDetails productId={product.id} initialProduct={product} />;
}
