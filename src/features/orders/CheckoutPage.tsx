"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { beginOperation, finishOperation, isDefinitiveRejection, readOperation } from "@/lib/api/pendingOperation";
import { cartApi, orderApi, promoApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

export function CheckoutPage() {
  const { t, errorMessage, formatPrice, formatNumber } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [code, setCode] = useState("");
  const operationScope = `checkout.${auth.user?.id}`;
  const [pending, setPending] = useState(() => readOperation<{ promoCode: string | null }>(operationScope));

  // checkout is authenticated-only; wait for the restored session
  const cart = useSessionQuery({
    queryKey: ["cart", auth.user?.id ?? "guest"],
    queryFn: cartApi.get,
    enabled: auth.isReady && auth.isAuthenticated
  });

  const promo = useSessionMutation({ mutationFn: (value: string) => promoApi.validate(value) });
  const appliedCode = promo.data?.code ?? null;

  const checkout = useSessionMutation({
    mutationFn: () => {
      const operation = beginOperation(operationScope, { promoCode: appliedCode });
      setPending(operation);
      return orderApi.checkout({ ...operation.payload, idempotencyKey: operation.key });
    },
    onError: (error) => {
      if (isDefinitiveRejection(error)) {
        finishOperation(operationScope);
        setPending(null);
      }
    },
    onSuccess: (order) => {
      finishOperation(operationScope);
      setPending(null);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/checkout/shipping?orderId=${order.id}`);
    }
  });

  return (
    <Protected>
      <main className="page">
        <div className="stack" style={{ gap: 8, marginBottom: 24 }}>
          <span className="kicker">{t("commerce.step1")}</span>
          <h1 className="title">{t("commerce.reviewOrder")}</h1>
          <p className="muted">{t("commerce.demoOrder")}</p>
        </div>
        {pending ? (
          <section className="card stack" style={{ padding: 24 }} aria-live="polite">
            <h2 className="subtitle">{t("commerce.recoverTitle")}</h2>
            <p>{t("commerce.recoverBody")}</p>
            <button className="button buttonDark" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
              {checkout.isPending ? t("commerce.checkingOrder") : t("commerce.recoverOrder")}
            </button>
            {checkout.error ? <p className="errorText">{errorMessage(checkout.error)}</p> : null}
          </section>
        ) : cart.isLoading ? (
          <Skeleton lines={4} />
        ) : !cart.data?.items?.length ? (
          <EmptyState title={t("commerce.emptyCart")} body={t("commerce.addBeforeCheckout")}>
            <Link className="button buttonDark" href="/catalog">
              {t("commerce.browse")}
            </Link>
          </EmptyState>
        ) : (
          <section className="split">
            <div className="stack">
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("commerce.item")}</th>
                      <th>{t("commerce.qty")}</th>
                      <th>{t("commerce.unit")}</th>
                      <th>{t("commerce.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.data.items.map((item) => (
                      <tr key={item.variantId}>
                        <td>
                          <div className="stack" style={{ gap: 4 }}>
                            <span style={{ fontWeight: 600 }}>{item.title}</span>
                            <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                              {[item.size, item.color, item.sku].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        </td>
                        <td className="mono">{formatNumber(item.quantity)}</td>
                        <td className="price">{formatPrice(item.price)}</td>
                        <td className="price">{formatPrice(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link className="button" style={{ justifySelf: "start" }} href="/cart">
                {t("commerce.editCart")}
              </Link>
            </div>

            <aside className="card stack" style={{ padding: 24 }}>
              <h2 className="subtitle" style={{ margin: 0 }}>
                {t("commerce.summary")}
              </h2>
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span className="muted">{t("commerce.subtotal")}</span>
                <span className="price" style={{ fontSize: "1.4rem" }}>
                  {formatPrice(cart.data.subtotal)}
                </span>
              </div>
              <label className="label">
                {t("commerce.promo")}
                <div className="toolbar" style={{ flexWrap: "nowrap" }}>
                  <input
                    className="input"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t("commerce.promoExample")}
                  />
                  <button
                    className="button"
                    type="button"
                    disabled={promo.isPending || !code.trim()}
                    onClick={() => promo.mutate(code.trim())}
                  >
                    {t("commerce.apply")}
                  </button>
                </div>
              </label>
              {promo.data ? (
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="status statusOk">
                    {promo.data.code} &minus;{formatPrice(promo.data.discount)}
                  </span>
                  <button className="button buttonSmall" type="button" onClick={() => promo.reset()}>
                    {t("commerce.remove")}
                  </button>
                </div>
              ) : null}
              {promo.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(promo.error)}</p> : null}
              <button className="button buttonDark" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                {checkout.isPending ? t("commerce.placing") : t("commerce.placeOrder")}
              </button>
              {checkout.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(checkout.error)}</p> : null}
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                {t("commerce.shippingNext")}
              </p>
            </aside>
          </section>
        )}
      </main>
    </Protected>
  );
}
