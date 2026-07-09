import { AdminShell } from "@/features/admin/AdminShell";
import { AiAdminPanel } from "@/features/admin/AiAdminPanel";

export default function Page() {
  return (
    <AdminShell title="AI maintenance">
      <AiAdminPanel />
    </AdminShell>
  );
}
