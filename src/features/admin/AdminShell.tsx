"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Protected } from "@/components/layout/Protected";

const NAV = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/promos", label: "Promos" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/ai", label: "AI" }
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Protected adminOnly>
      <main className="page">
        <div className="stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 12 }}>
            <div className="stack" style={{ gap: 4 }}>
              <Link className="kicker" href="/admin">
                shopupu back office
              </Link>
              <h1 className="title">{title}</h1>
            </div>
            <nav className="adminTabs" aria-label="Admin sections">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} data-active={pathname.startsWith(item.href)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <section className="stack">{children}</section>
        </div>
      </main>
    </Protected>
  );
}
