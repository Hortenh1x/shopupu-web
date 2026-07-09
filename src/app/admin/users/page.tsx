"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const [page, setPage] = useState(0);
  const users = useQuery({ queryKey: ["admin-users", page], queryFn: () => adminApi.users(page) });
  const data = users.data;

  return (
    <AdminShell title="Users">
      {users.error ? <p className="errorText">{(users.error as Error).message}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Name</th>
            <th>Roles</th>
            <th>Status</th>
            <th>Email verified</th>
          </tr>
        </thead>
        <tbody>
          {data?.content?.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "-"}</td>
              <td>{user.roles?.join(", ")}</td>
              <td>{user.enabled ? "enabled" : "disabled"}</td>
              <td>{user.emailVerified ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="mono muted" style={{ fontSize: "0.88rem" }}>{page + 1} / {data.totalPages}</span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
