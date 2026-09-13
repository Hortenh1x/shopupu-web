"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { beginOperation, finishOperation, isDefinitiveRejection } from "@/lib/api/pendingOperation";
import { orderApi, paymentApi, storefrontApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isStripeCheckoutUrl } from "@/lib/url";

export function CreatePaymentPage() {
  const { t, errorMessage, formatPrice, statusLabel } = useI18n();
  const params = useSearchParams();
  const orderId = Number(params.get("orderId"));
  const auth = useAuth();
  const operationScope = `payment.${auth.user?.id}.${orderId}`;
  const config = useQuery({ queryKey: ["storefront-config"], queryFn: storefrontApi.config });
  const paymentMode = config.data?.payments.mode;
  const available = config.data?.demoMode && config.data.payments.testMode && config.data.payments.available;

  const order = useSessionQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderApi.get(orderId),
    enabled: auth.isReady && auth.isAuthenticated && Number.isFinite(orderId) && orderId > 0
  });

  const createPayment = useSessionMutation({
    mutationFn: () => {
      const operation = beginOperation(operationScope, { orderId });
      return paymentApi.create(operation.payload.orderId, operation.key);
    },
    onError: (error) => {
      if (isDefinitiveRejection(error)) finishOperation(operationScope);
    },
    onSuccess: (payment) => {
      if (["FAILED", "CANCELED", "EXPIRED"].includes(payment.status)) finishOperation(operationScope);
      if (["CREATED", "PENDING"].includes(payment.status) && isStripeCheckoutUrl(payment.paymentUrl)) {
        window.location.href = payment.paymentUrl;
      }
    }
  });

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <main className="page">
        <EmptyState title={t("commerce.missingOrder")} body={t("commerce.openPaymentFromOrder")}>
          <Link className="button buttonDark" href="/orders">
            {t("commerce.orders")}
          </Link>
        </EmptyState>
      </main>
    );
  }

  const payment = createPayment.data;
  const redirecting = payment && ["CREATED", "PENDING"].includes(payment.status) && isStripeCheckoutUrl(payment.paymentUrl);

  return (
    <Protected>
      <main className="page">
        <div className="stack" style={{ gap: 8, marginBottom: 24 }}>
          <span className="kicker">{t("commerce.step3")}</span>
          <h1 className="title">{t("commerce.tryTestPayment")}</h1>
          <p className="muted">{t("commerce.paymentDemo")}</p>
        </div>
        <section className="split">
          <div className="card stack" style={{ padding: 24 }}>
            {order.isLoading ? (
              <Skeleton lines={4} />
            ) : order.data ? (
              <div className="stack" style={{ gap: 8 }}>
                <span className="mono muted" style={{ fontSize: "0.85rem" }}>
                  {t("commerce.orderNumber", { number: order.data.orderNumber })}
                </span>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">{t("commerce.subtotal")}</span>
                  <span className="price">{formatPrice(order.data.subtotalAmount)}</span>
                </div>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">{t("commerce.shipping")}</span>
                  <span className="price">{formatPrice(order.data.shippingAmount)}</span>
                </div>
                {order.data.discountAmount > 0 ? (
                  <div className="toolbar" style={{ justifyContent: "space-between" }}>
                    <span className="muted">{t("commerce.discount")}{order.data.promoCode ? ` (${order.data.promoCode})` : ""}</span>
                    <span className="price">&minus;{formatPrice(order.data.discountAmount)}</span>
                  </div>
                ) : null}
                <hr className="divider" />
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{t("commerce.total")}</span>
                  <span className="price" style={{ fontSize: "1.6rem" }}>
                    {formatPrice(order.data.paymentAmount)}
                  </span>
                </div>
              </div>
            ) : null}
            {order.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(order.error)}</p> : null}
            <button
              className="button buttonAccent"
              disabled={!available || !order.data || createPayment.isPending || Boolean(payment && !["FAILED", "CANCELED", "EXPIRED"].includes(payment.status))}
              onClick={() => createPayment.mutate()}
            >
              {createPayment.isPending ? t("commerce.preparingPayment") : paymentMode === "LOCAL_SIMULATION" ? t("commerce.tryLocal") : t("commerce.stripeCheckout")}
            </button>
            <p className="muted" style={{ margin: 0 }}>
              {config.isLoading ? t("commerce.checkAvailability") : !available
                ? t("commerce.paymentUnavailable")
                : paymentMode === "LOCAL_SIMULATION"
                  ? t("commerce.localDetails")
                  : t("commerce.stripeDetails")}
            </p>
            {config.isError ? <button className="button" onClick={() => config.refetch()}>{t("commerce.recheckAvailability")}</button> : null}
            {createPayment.error ? (
              <p className="errorText" style={{ margin: 0 }}>
                {errorMessage(createPayment.error)}
              </p>
            ) : null}
            {redirecting ? (
              <p className="muted" style={{ margin: 0 }}>
                {t("commerce.redirecting")}
              </p>
            ) : null}
            <Link className="button" style={{ justifySelf: "start" }} href={`/orders/${orderId}`}>
              {t("commerce.backOrder")}
            </Link>
          </div>

          {payment && !redirecting ? (
            <aside className="card stack" style={{ padding: 24 }}>
              <span className="status statusWarn">{statusLabel(payment.status)}</span>
              <p className="mono" style={{ margin: 0 }}>
                {t("commerce.paymentRecordLine", { id: payment.id, amount: formatPrice(payment.amount, payment.currency) })}
              </p>
              <Link className="button buttonDark" href={`/payment/${payment.id}`}>
                {t("commerce.trackPayment")}
              </Link>
            </aside>
          ) : null}
        </section>
      </main>
    </Protected>
  );
}
