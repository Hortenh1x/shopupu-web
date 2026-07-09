import Link from "next/link";
import { AdminShell } from "@/features/admin/AdminShell";

const WORKSPACES = [
  { href: "/admin/products", label: "Products", note: "Clothing attributes, variants, stock and images" },
  { href: "/admin/categories", label: "Categories", note: "Tree, slugs and descriptions" },
  { href: "/admin/orders", label: "Orders", note: "Status transitions, history, shipping and refunds" },
  { href: "/admin/reviews", label: "Reviews", note: "Moderation queue: approve or reject" },
  { href: "/admin/promos", label: "Promos", note: "Codes, limits and redemption counts" },
  { href: "/admin/users", label: "Users", note: "Accounts and roles" },
  { href: "/admin/ai", label: "AI maintenance", note: "Embeddings, recommendations and review summaries" }
];

export default function Page() {
  return (
    <AdminShell title="Back office">
      <div className="card" style={{ padding: "4px 24px" }}>
        {WORKSPACES.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="toolbar"
            style={{
              justifyContent: "space-between",
              padding: "16px 0",
              borderTop: index > 0 ? "1px solid var(--line)" : undefined
            }}
          >
            <span className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 650, fontFamily: "var(--font-head)", fontSize: "1.05rem" }}>
                {item.label}
              </span>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                {item.note}
              </span>
            </span>
            <span aria-hidden="true" className="mono muted">
              &rarr;
            </span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
