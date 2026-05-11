"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const products = useQuery({ queryKey: ["admin-products"], queryFn: adminApi.products });
  return (
    <AdminShell title="Products">
      <Link className="button buttonDark" href="/admin/products/new">New product</Link>
      <table className="table">
        <thead><tr><th>ID</th><th>Title</th><th>Price</th><th>Enabled</th><th /></tr></thead>
        <tbody>
          {products.data?.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td>{product.title}</td>
              <td>{Number(product.price).toFixed(2)}</td>
              <td>{product.enabled ? "enabled" : "disabled"}</td>
              <td><Link className="button" href={`/admin/products/${product.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
