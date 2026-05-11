"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const users = useQuery({ queryKey: ["admin-users"], queryFn: adminApi.users });
  return (
    <AdminShell title="Users">
      <table className="table">
        <thead><tr><th>ID</th><th>Email</th><th>Roles</th><th>Status</th></tr></thead>
        <tbody>
          {users.data?.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{user.roles?.join(", ")}</td>
              <td>{user.enabled ? "enabled" : "disabled"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
