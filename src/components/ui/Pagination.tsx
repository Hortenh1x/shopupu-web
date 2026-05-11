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
    <div className="toolbar" style={{ justifyContent: "center", marginTop: 24 }}>
      <button className="button" disabled={page <= 0} onClick={() => go(page - 1)}>
        Previous
      </button>
      <span className="status">
        {page + 1} / {totalPages}
      </span>
      <button className="button" disabled={page >= totalPages - 1} onClick={() => go(page + 1)}>
        Next
      </button>
    </div>
  );
}
