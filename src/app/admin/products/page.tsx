"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const products = useQuery({ queryKey: ["admin-products", page], queryFn: () => adminApi.products(page) });
  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] })
  });

  const data = products.data;

  return (
    <AdminShell title="Products">
      <Link className="button buttonDark" href="/admin/products/new" style={{ alignSelf: "flex-start" }}>
        New product
      </Link>
      {products.error ? <p className="muted">{(products.error as Error).message}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Brand</th>
            <th>Gender</th>
            <th>Price</th>
            <th>Variants</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.content?.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td>{product.title}</td>
              <td>{product.brandName ?? "-"}</td>
              <td>{product.gender?.toLowerCase() ?? "-"}</td>
              <td>{Number(product.price).toFixed(2)}</td>
              <td>{product.variants?.length ?? 0}</td>
              <td>{product.enabled ? "enabled" : "disabled"}</td>
              <td>
                <div className="toolbar">
                  <Link className="button" href={`/admin/products/${product.id}`}>
                    Edit
                  </Link>
                  <button className="button buttonRed" disabled={remove.isPending} onClick={() => remove.mutate(product.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="status">
            {page + 1} / {data.totalPages}
          </span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
