"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { userApi } from "@/lib/api/shop";

export function WishlistPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const wishlist = useQuery({ queryKey: ["wishlist", page], queryFn: () => userApi.wishlist(page) });
  const remove = useMutation({
    mutationFn: (productId: number) => userApi.removeFromWishlist(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] })
  });

  const data = wishlist.data;

  return (
    <div className="stack">
      <h2 className="subhead" style={{ margin: 0 }}>
        Wishlist
      </h2>
      {wishlist.error ? <p className="muted">{(wishlist.error as Error).message}</p> : null}
      {!data?.content?.length ? <p className="muted">Nothing saved yet - add products from their pages.</p> : null}
      {data?.content?.map((entry) => (
        <article key={entry.productId} className="card toolbar" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 4 }}>
            <Link href={`/products/${entry.productId}`}>
              <strong>{entry.title}</strong>
            </Link>
            <span className="muted">
              {entry.brandName ? `${entry.brandName} / ` : ""}
              {Number(entry.price).toFixed(2)} EUR
              {entry.oldPrice ? ` (was ${Number(entry.oldPrice).toFixed(2)})` : ""}
              {entry.available === false ? " / unavailable" : ""}
            </span>
          </div>
          <button className="button buttonRed" disabled={remove.isPending} onClick={() => remove.mutate(entry.productId)}>
            Remove
          </button>
        </article>
      ))}
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="status">
            {page + 1} / {data.totalPages}
          </span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
