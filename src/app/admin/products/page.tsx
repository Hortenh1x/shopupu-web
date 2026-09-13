"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export default function Page() {
  const { t, errorMessage, formatPrice, genderLabel } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const products = useSessionQuery({ queryKey: ["admin-products", page], queryFn: () => adminApi.products(page) });
  const remove = useSessionMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] })
  });

  const data = products.data;

  return (
    <AdminShell title={t("admin.nav.products")}>
      <Link className="button buttonDark" href="/admin/products/new" style={{ alignSelf: "flex-start" }}>
        {t("admin.newProduct")}
      </Link>
      {products.error ? <p className="errorText">{errorMessage(products.error)}</p> : null}
      {remove.error ? <p className="errorText">{errorMessage(remove.error)}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>{t("admin.id")}</th>
            <th>{t("admin.field.title")}</th>
            <th>{t("admin.brand")}</th>
            <th>{t("admin.gender")}</th>
            <th>{t("admin.price")}</th>
            <th>{t("admin.variants")}</th>
            <th>{t("admin.status")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.content?.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td>{product.title}</td>
              <td>{product.brandName ?? "-"}</td>
              <td>{product.gender ? genderLabel(product.gender) : "-"}</td>
              <td>{formatPrice(product.price)}</td>
              <td>{product.variants?.length ?? 0}</td>
              <td>{product.enabled ? t("common.enabled") : t("common.disabled")}</td>
              <td>
                <div className="toolbar">
                  <Link className="button" href={`/admin/products/${product.id}`}>
                    {t("common.edit")}
                  </Link>
                  <ConfirmButton
                    label={t("common.delete")}
                    confirmLabel={t("common.confirmDelete")}
                    disabled={remove.isPending}
                    onConfirm={() => remove.mutate(product.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {t("common.previous")}
          </button>
          <span className="mono muted" style={{ fontSize: "0.88rem" }}>{t("common.page", { page: page + 1, pages: data.totalPages })}</span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            {t("common.next")}
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
