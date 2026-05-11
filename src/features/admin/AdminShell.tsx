"use client";

import Link from "next/link";
import { Protected } from "@/components/layout/Protected";

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Protected adminOnly>
      <main className="page">
        <section className="split" style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}>
          <aside className="card stack" style={{ position: "sticky", top: 92 }}>
            <strong className="status">admin</strong>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/categories">Categories</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/shipping">Shipping</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/reviews">Reviews</Link>
          </aside>
          <section className="stack">
            <h1 className="title">{title}</h1>
            {children}
          </section>
        </section>
      </main>
    </Protected>
  );
}
