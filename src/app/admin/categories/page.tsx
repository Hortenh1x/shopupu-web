"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi, catalogApi } from "@/lib/api/shop";

export default function Page() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const create = useMutation({
    mutationFn: () =>
      adminApi.createCategory({ name, slug, description: "", parentId: parentId ? Number(parentId) : null }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setParentId("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  });
  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });

  const parentName = (id?: number | null) => categories.data?.find((c) => c.id === id)?.name ?? "-";

  return (
    <AdminShell title="Categories">
      <form
        className="card toolbar"
        style={{ flexWrap: "wrap", alignItems: "flex-end" }}
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <label className="label">
          Name
          <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="label">
          Slug
          <input className="input" required value={slug} onChange={(event) => setSlug(event.target.value)} />
        </label>
        <label className="label">
          Parent
          <select className="select" value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">None (root)</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button buttonDark" disabled={create.isPending}>
          Create
        </button>
      </form>
      {create.error ? <p className="errorText">{(create.error as Error).message}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Slug</th>
            <th>Parent</th>
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
                <button className="button buttonRed" disabled={remove.isPending} onClick={() => remove.mutate(category.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {remove.error ? <p className="errorText">{(remove.error as Error).message}</p> : null}
    </AdminShell>
  );
}
