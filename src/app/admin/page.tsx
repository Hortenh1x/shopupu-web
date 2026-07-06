import Link from "next/link";
import { AdminShell } from "@/features/admin/AdminShell";

const WORKSPACES = ["products", "categories", "orders", "reviews", "promos", "users"];

export default function Page() {
  return (
    <AdminShell title="Admin">
      <div className="grid">
        {WORKSPACES.map((item) => (
          <Link key={item} className="card stack" href={`/admin/${item}`}>
            <strong>{item.toUpperCase()}</strong>
            <span className="muted">Open {item} workspace</span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
