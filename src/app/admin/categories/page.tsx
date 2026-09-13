"use client";

import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi, catalogApi } from "@/lib/api/shop";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export default function Page() {
  const { t, errorMessage } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const create = useSessionMutation({
    mutationFn: () =>
      adminApi.createCategory({ name, slug, description: "", parentId: parentId ? Number(parentId) : null }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setParentId("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  });
  const remove = useSessionMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });

  const parentName = (id?: number | null) => categories.data?.find((c) => c.id === id)?.name ?? "-";

  return (
    <AdminShell title={t("admin.nav.categories")}>
      <form
        className="card toolbar"
        style={{ flexWrap: "wrap", alignItems: "flex-end" }}
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <label className="label">
          {t("admin.name")}
          <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="label">
          {t("admin.slug")}
          <input className="input" required value={slug} onChange={(event) => setSlug(event.target.value)} />
        </label>
        <label className="label">
          {t("admin.parent")}
          <select className="select" value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">{t("admin.rootParent")}</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button buttonDark" disabled={create.isPending}>
          {t("admin.create")}
        </button>
      </form>
      {create.error ? <p className="errorText">{errorMessage(create.error)}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>{t("admin.id")}</th>
            <th>{t("admin.name")}</th>
            <th>{t("admin.slug")}</th>
            <th>{t("admin.parent")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {categories.data?.map((category) => (
            <tr key={category.id}>
              <td>{category.id}</td>
              <td>{category.name}</td>
              <td className="muted">{category.slug}</td>
              <td>{parentName(category.parentId)}</td>
              <td>
                <ConfirmButton
                  label={t("common.delete")}
                  confirmLabel={t("common.confirmDelete")}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(category.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {remove.error ? <p className="errorText">{errorMessage(remove.error)}</p> : null}
    </AdminShell>
  );
}
