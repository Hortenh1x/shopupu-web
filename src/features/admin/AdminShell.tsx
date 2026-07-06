"use client";

import Link from "next/link";
import { Protected } from "@/components/layout/Protected";

const NAV = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/promos", label: "Promos" },
  { href: "/admin/users", label: "Users" }
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Protected adminOnly>
      <main className="page">
        <section className="split" style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}>
          <aside className="card stack" style={{ position: "sticky", top: 92, alignSelf: "start" }}>
            <strong className="status">admin</strong>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
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
