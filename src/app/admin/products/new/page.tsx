import { AdminShell } from "@/features/admin/AdminShell";
import { ProductForm } from "@/features/admin/ProductForm";

export default function Page() {
  return (
    <AdminShell title="New product">
      <ProductForm />
    </AdminShell>
  );
}
