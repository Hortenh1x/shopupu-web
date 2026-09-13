import { AdminShell } from "@/features/admin/AdminShell";
import { ProductForm } from "@/features/admin/ProductForm";
import { getServerI18n } from "@/lib/i18n/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getServerI18n();
  return (
    <AdminShell title={t("admin.productTitle", { id })}>
      <ProductForm productId={Number(id)} />
    </AdminShell>
  );
}
