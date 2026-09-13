import { AdminShell } from "@/features/admin/AdminShell";
import { ProductForm } from "@/features/admin/ProductForm";
import { getServerI18n } from "@/lib/i18n/server";

export default async function Page() {
  const { t } = await getServerI18n();
  return (
    <AdminShell title={t("admin.newProduct")}>
      <ProductForm />
    </AdminShell>
  );
}
