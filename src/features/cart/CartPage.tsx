"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cartApi } from "@/lib/api/shop";
import type { Cart, CartItem } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

// taps update the cart instantly; the server write follows once they settle
const COMMIT_DELAY_MS = 350;
const UNDO_WINDOW_MS = 6000;

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function withQuantity(cart: Cart, variantId: number, quantity: number): Cart {
  const items = cart.items.map((item) =>
    item.variantId === variantId ? { ...item, quantity, lineTotal: money(item.price * quantity) } : item
  );
  return recount(cart, items);
}

function withoutItem(cart: Cart, variantId: number): Cart {
  return recount(cart, cart.items.filter((item) => item.variantId !== variantId));
}

function recount(cart: Cart, items: CartItem[]): Cart {
  return {
    ...cart,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: money(items.reduce((sum, item) => sum + item.lineTotal, 0))
  };
}

export function CartPage() {
  const { t, errorMessage, formatPrice, formatNumber } = useI18n();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const cartKey = ["cart", auth.user?.id ?? "guest"];
  // wait until the session is restored so the request carries the right identity
  const cart = useSessionQuery({
    queryKey: cartKey,
    queryFn: cartApi.get,
    enabled: auth.isReady
  });
  const [removed, setRemoved] = useState<CartItem | null>(null);
  const commitTimers = useRef(new Map<number, { timer: ReturnType<typeof setTimeout>; quantity: number }>());
  const removal = useRef<Promise<unknown> | null>(null);

  // a server reply must not roll back taps that are still waiting to be sent
  const showServerCart = (data: Cart) => {
    let next = data;
    for (const [variantId, pending] of commitTimers.current) next = withQuantity(next, variantId, pending.quantity);
    queryClient.setQueryData(cartKey, next);
  };
  const reloadCart = () => queryClient.invalidateQueries({ queryKey: cartKey });

  const update = useSessionMutation({
    mutationFn: ({ variantId, quantity }: { variantId: number; quantity: number }) => cartApi.setQuantity(variantId, quantity),
    onSuccess: showServerCart,
    // the optimistic value was wrong (e.g. stock ran out): fall back to server truth
    onError: reloadCart
  });
  const remove = useSessionMutation({
    mutationFn: (variantId: number) => cartApi.remove(variantId),
    onSuccess: showServerCart,
    onError: reloadCart
  });
  const restore = useSessionMutation({
    mutationFn: async (item: CartItem) => {
      // the undo may land before the removal has been acknowledged
      await removal.current?.catch(() => undefined);
      return cartApi.add(item.variantId, item.quantity);
    },
    onSuccess: showServerCart,
    onError: reloadCart
  });

  function changeQuantity(variantId: number, delta: 1 | -1) {
    // read the cache, not the rendered row: two taps inside one frame must add up
    const item = queryClient.getQueryData<Cart>(cartKey)?.items.find((line) => line.variantId === variantId);
    if (!item) return;
    const quantity = item.quantity + delta;
    if (quantity < 1) {
      removeLine(item);
      return;
    }
    queryClient.setQueryData<Cart>(cartKey, (current) => (current ? withQuantity(current, variantId, quantity) : current));
    const pending = commitTimers.current.get(variantId);
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => {
      commitTimers.current.delete(variantId);
      update.mutate({ variantId, quantity });
    }, COMMIT_DELAY_MS);
    commitTimers.current.set(variantId, { timer, quantity });
  }

  function removeLine(item: CartItem) {
    const pending = commitTimers.current.get(item.variantId);
    if (pending) {
      clearTimeout(pending.timer);
      commitTimers.current.delete(item.variantId);
    }
    queryClient.setQueryData<Cart>(cartKey, (current) => (current ? withoutItem(current, item.variantId) : current));
    setRemoved(item);
    removal.current = remove.mutateAsync(item.variantId).catch(() => undefined);
  }

  function undoRemove(item: CartItem) {
    setRemoved(null);
    restore.mutate(item);
  }

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  // leaving the page must not lose a quantity change that is still waiting to be sent
  useEffect(() => {
    const timers = commitTimers.current;
    return () => {
      for (const [variantId, pending] of timers) {
        clearTimeout(pending.timer);
        cartApi.setQuantity(variantId, pending.quantity).then(showServerCart, reloadCart);
      }
      timers.clear();
    };
  }, []);

  if (cart.isLoading || !auth.isReady) {
    return (
      <main className="page">
        <h1 className="title" style={{ marginBottom: 24 }}>
          {t("commerce.cart")}
        </h1>
        <Skeleton lines={4} />
      </main>
    );
  }

  const lineError = update.error ?? remove.error ?? restore.error;

  return (
    <main className="page">
      <h1 className="title" style={{ marginBottom: 24 }}>
        {t("commerce.cart")}
      </h1>
      {cart.error ? <p className="errorText">{errorMessage(cart.error)}</p> : null}
      {removed ? (
        <div className="undoNotice" role="status" style={{ marginBottom: 16 }}>
          <span>{t("common.removed", { title: removed.title })}</span>
          <button type="button" className="button buttonSmall" disabled={restore.isPending} onClick={() => undoRemove(removed)}>
            {restore.isPending ? t("common.restoring") : t("common.undo")}
          </button>
        </div>
      ) : null}
      {!cart.data?.items?.length ? (
        <EmptyState title={t("commerce.emptyCart")} body={t("commerce.guestCartBody")}>
          <Link className="button buttonDark" href="/catalog">
            {t("commerce.browse")}
          </Link>
        </EmptyState>
      ) : (
        <section className="split">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("commerce.item")}</th>
                  <th>{t("commerce.unit")}</th>
                  <th>{t("commerce.qty")}</th>
                  <th>{t("commerce.total")}</th>
                  <th aria-label={t("common.actions")} />
                </tr>
              </thead>
              <tbody>
                {cart.data.items.map((item) => (
                  <tr key={item.variantId}>
                    <td>
                      <div className="stack" style={{ gap: 4 }}>
                        <Link href={`/products/${item.productId}`} style={{ fontWeight: 600 }}>
                          {item.title}
                        </Link>
                        <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                          {[item.size, item.color, item.sku].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </td>
                    <td className="price">{formatPrice(item.price)}</td>
                    <td>
                      <div className="qty">
                        <button
                          type="button"
                          aria-label={t("commerce.decrease")}
                          onClick={() => changeQuantity(item.variantId, -1)}
                        >
                          &minus;
                        </button>
                        <span aria-live="polite">{formatNumber(item.quantity)}</span>
                        <button
                          type="button"
                          aria-label={t("commerce.increase")}
                          onClick={() => changeQuantity(item.variantId, 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="price">{formatPrice(item.lineTotal)}</td>
                    <td>
                      <button type="button" className="button buttonRed buttonSmall" onClick={() => removeLine(item)}>
                        {t("commerce.remove")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lineError ? <p className="errorText">{errorMessage(lineError)}</p> : null}
          </div>

          <aside className="panelInk stack" style={{ position: "sticky", top: 84, padding: 28, gap: 16 }}>
            <h2 className="subtitle" style={{ margin: 0 }}>
              {t("commerce.summaryTitle")}
            </h2>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <span className="muted">
                {t(cart.data.totalItems === 1 ? "commerce.itemCountOne" : "commerce.itemCountMany", { count: formatNumber(cart.data.totalItems) })}
              </span>
              <span className="price" style={{ fontSize: "1.7rem" }}>
                {formatPrice(cart.data.subtotal)}
              </span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              {t("commerce.shippingPromo")}
            </p>
            {!auth.isReady ? null : auth.isAuthenticated ? (
              <Link className="button buttonAccent" href="/checkout">
                {t("commerce.checkout")}
              </Link>
            ) : (
              <>
                <Link className="button buttonAccent" href="/login">
                  {t("commerce.signinCheckout")}
                </Link>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {t("commerce.cartMerge")}
                </p>
              </>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
