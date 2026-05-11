import { AdminShell } from "@/features/admin/AdminShell";
import { ProductForm } from "@/features/admin/ProductForm";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminShell title={`Product #${id}`}>
      <ProductForm productId={Number(id)} />
    </AdminShell>
  );
}
