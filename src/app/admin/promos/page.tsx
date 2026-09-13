import { AdminShell } from "@/features/admin/AdminShell";
import { PromoAdmin } from "@/features/admin/PromoAdmin";
import { getServerI18n } from "@/lib/i18n/server";

export default async function Page() {
  const { t } = await getServerI18n();
  return (
    <AdminShell title={t("admin.promoCodes")}>
      <PromoAdmin />
    </AdminShell>
  );
}
