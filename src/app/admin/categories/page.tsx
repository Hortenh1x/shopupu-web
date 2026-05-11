"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi, catalogApi } from "@/lib/api/shop";

export default function Page() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const create = useMutation({
    mutationFn: () => adminApi.createCategory({ name, slug, description: "", parentId: null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });
  return (
    <AdminShell title="Categories">
      <form className="card toolbar" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <label className="label">Name<input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="label">Slug<input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
        <button className="button buttonDark">Create</button>
      </form>
      <table className="table">
        <thead><tr><th>ID</th><th>Name</th><th>Slug</th></tr></thead>
        <tbody>
          {categories.data?.map((category) => <tr key={category.id}><td>{category.id}</td><td>{category.name}</td><td>{category.slug}</td></tr>)}
        </tbody>
      </table>
    </AdminShell>
  );
}
