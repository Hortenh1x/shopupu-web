"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const params = useSearchParams();

  function go(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage + 1));
    router.push(`?${next.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <nav className="toolbar" style={{ justifyContent: "center", marginTop: 28 }} aria-label="Pagination">
      <button className="button buttonSmall" disabled={page <= 0} onClick={() => go(page - 1)}>
        Previous
      </button>
      <span className="mono muted" style={{ fontSize: "0.88rem", padding: "0 6px" }}>
        {page + 1} / {totalPages}
      </span>
      <button className="button buttonSmall" disabled={page >= totalPages - 1} onClick={() => go(page + 1)}>
        Next
      </button>
    </nav>
  );
}
