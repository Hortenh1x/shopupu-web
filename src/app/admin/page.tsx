import Link from "next/link";
import { AdminShell } from "@/features/admin/AdminShell";

export default function Page() {
  return (
    <AdminShell title="Admin">
      <div className="grid">
        {["products", "categories", "orders", "shipping", "users", "reviews"].map((item) => (
          <Link key={item} className="card stack" href={`/admin/${item}`}>
            <strong>{item.toUpperCase()}</strong>
            <span className="muted">Open {item} workspace</span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
