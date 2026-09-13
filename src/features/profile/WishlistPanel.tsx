"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { userApi } from "@/lib/api/shop";
import type { Page, WishlistEntry } from "@/lib/api/types";

const UNDO_WINDOW_MS = 6000;

export function WishlistPanel() {
  const { t, errorMessage, formatPrice, formatNumber } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [removed, setRemoved] = useState<WishlistEntry | null>(null);
  const removal = useRef<Promise<unknown> | null>(null);
  const wishlist = useSessionQuery({ queryKey: ["wishlist", page], queryFn: () => userApi.wishlist(page) });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  const remove = useSessionMutation({
    mutationFn: (productId: number) => userApi.removeFromWishlist(productId),
    onSuccess: reload,
    onError: reload
  });
  const restore = useSessionMutation({
    mutationFn: async (entry: WishlistEntry) => {
      // the undo may land before the removal has been acknowledged
      await removal.current?.catch(() => undefined);
      return userApi.addToWishlist(entry.productId);
    },
    onSuccess: reload,
    onError: reload
  });

  // the entry leaves the list at once; the server catches up behind the undo window
  function removeEntry(entry: WishlistEntry) {
    queryClient.setQueryData<Page<WishlistEntry>>(["wishlist", page], (current) =>
      current ? { ...current, content: current.content.filter((item) => item.productId !== entry.productId) } : current
    );
    setRemoved(entry);
    removal.current = remove.mutateAsync(entry.productId).catch(() => undefined);
  }

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const data = wishlist.data;
  const actionError = remove.error ?? restore.error;

  return (
    <div className="stack">
      <h2 className="subtitle" style={{ margin: 0 }}>
        {t("profile.tabWishlist")}
      </h2>
      {wishlist.error ? <p className="errorText">{errorMessage(wishlist.error)}</p> : null}
      {actionError ? <p className="errorText">{errorMessage(actionError)}</p> : null}
      {removed ? (
        <div className="undoNotice" role="status">
          <span>{t("common.removed", { title: removed.title })}</span>
          <button
            type="button"
            className="button buttonSmall"
            disabled={restore.isPending}
            onClick={() => {
              setRemoved(null);
              restore.mutate(removed);
            }}
          >
            {restore.isPending ? t("common.restoring") : t("common.undo")}
          </button>
        </div>
      ) : null}
      {!data?.content?.length ? <p className="muted">{t("profile.noWishlist")}</p> : null}
      {data?.content?.map((entry) => (
        <article key={entry.productId} className="card toolbar" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 4 }}>
            <Link href={`/products/${entry.productId}`}>
              <strong>{entry.title}</strong>
            </Link>
            <span className="muted">
              {entry.brandName ? `${entry.brandName} / ` : ""}
              {formatPrice(entry.price)}
              {entry.oldPrice ? t("profile.was", { price: formatPrice(entry.oldPrice) }) : ""}
              {entry.available === false ? t("profile.unavailable") : ""}
            </span>
          </div>
          <button type="button" className="button buttonRed" onClick={() => removeEntry(entry)}>
            {t("commerce.remove")}
          </button>
        </article>
      ))}
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {t("common.previous")}
          </button>
          <span className="mono muted" style={{ fontSize: "0.88rem" }}>{formatNumber(page + 1)} / {formatNumber(data.totalPages)}</span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            {t("common.next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
