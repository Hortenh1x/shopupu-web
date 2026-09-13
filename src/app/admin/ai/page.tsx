import { AdminShell } from "@/features/admin/AdminShell";
import { AiAdminPanel } from "@/features/admin/AiAdminPanel";
import { getServerI18n } from "@/lib/i18n/server";

export default async function Page() {
  const { t } = await getServerI18n();
  return (
    <AdminShell title={t("admin.nav.aiMaintenance")}>
      <AiAdminPanel />
    </AdminShell>
  );
}
