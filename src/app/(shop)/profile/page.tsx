"use client";

import { Protected } from "@/components/layout/Protected";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function Page() {
  const auth = useAuth();

  return (
    <Protected>
      <main className="page">
        <section className="brutal stack" style={{ padding: 28 }}>
          <h1 className="title">Profile</h1>
          <p>Email: {auth.user?.email}</p>
          <p>Roles: {auth.user?.roles?.join(", ") || "CUSTOMER"}</p>
          <p>Status: {auth.user?.enabled ? "enabled" : "disabled"}</p>
          <button className="button buttonDark" onClick={auth.reloadUser}>Refresh session</button>
        </section>
      </main>
    </Protected>
  );
}
