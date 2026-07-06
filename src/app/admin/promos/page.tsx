import { AdminShell } from "@/features/admin/AdminShell";
import { PromoAdmin } from "@/features/admin/PromoAdmin";

export default function Page() {
  return (
    <AdminShell title="Promo codes">
      <PromoAdmin />
    </AdminShell>
  );
}
