"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Protected } from "@/components/layout/Protected";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export const ADMIN_NAV = [
  { href: "/admin/products", label: "admin.nav.products", note: "admin.note.products" },
  { href: "/admin/categories", label: "admin.nav.categories", note: "admin.note.categories" },
  { href: "/admin/orders", label: "admin.nav.orders", note: "admin.note.orders" },
  { href: "/admin/reviews", label: "admin.nav.reviews", note: "admin.note.reviews" },
  { href: "/admin/promos", label: "admin.nav.promos", note: "admin.note.promos" },
  { href: "/admin/users", label: "admin.nav.users", note: "admin.note.users" },
  { href: "/admin/ai", label: "admin.nav.ai", note: "admin.note.ai" }
] as const;

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <Protected adminOnly>
      <main className="page">
        <div className="stack" style={{ gap: 20 }}>
          <div className="stack" style={{ gap: 12 }}>
            <div className="stack" style={{ gap: 4 }}>
              <Link className="kicker" href="/admin">
                {t("admin.backOffice")}
              </Link>
              <h1 className="title">{title}</h1>
            </div>
            <nav className="adminTabs" aria-label={t("admin.sections")}>
              {ADMIN_NAV.map((item) => (
                <Link key={item.href} href={item.href} data-active={pathname.startsWith(item.href)}>
                  {t(item.label)}
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
