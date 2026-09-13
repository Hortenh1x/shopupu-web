"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { paymentApi, storefrontApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { PaymentStatus } from "@/lib/api/types";
import { isStripeCheckoutUrl } from "@/lib/url";

const failedStatuses: PaymentStatus[] = ["FAILED", "CANCELED", "EXPIRED"];

function statusClass(status: PaymentStatus) {
  if (status === "SUCCEEDED") return "status statusOk";
  if (failedStatuses.includes(status)) return "status statusDanger";
  if (status === "REFUNDED") return "status statusBrand";
  return "status statusWarn";
}

export function PaymentStatusPage({ paymentId }: { paymentId: number }) {
  const { t, errorMessage, formatPrice, statusLabel } = useI18n();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ["storefront-config"], queryFn: storefrontApi.config });
  const payment = useSessionQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => paymentApi.get(paymentId),
    enabled: auth.isReady && auth.isAuthenticated,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // poll while the payment can still change
      return !status || status === "CREATED" || status === "PENDING" ? 3000 : false;
    }
  });
  const simulation = useSessionMutation({
    mutationFn: () => paymentApi.simulateSuccess(paymentId),
    onSuccess: (result) => {
      queryClient.setQueryData(["payment", paymentId], result);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", result.orderId] });
    }
  });

  return (
    <Protected>
      <main className="page">
        {payment.isLoading ? (
          <Skeleton lines={4} />
        ) : !payment.data ? (
          <EmptyState title={t("commerce.paymentNotFound")} body={payment.error ? errorMessage(payment.error) : undefined}>
            <Link className="button" href="/orders">
              {t("commerce.orders")}
            </Link>
          </EmptyState>
        ) : (
          <section className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start", gap: 16 }}>
            {payment.data.status === "SUCCEEDED" ? (
              <>
                <h1 className="title">
                  {t("commerce.payment")} <span className="mark">{t("commerce.succeededWord")}</span>.
                </h1>
                <p className="subhead" style={{ margin: 0 }}>
                  {t("commerce.testPaymentSuccess")}
                </p>
              </>
            ) : failedStatuses.includes(payment.data.status) ? (
              <>
                <h1 className="title">{t("commerce.paymentStatusTitle", { status: statusLabel(payment.data.status) })}</h1>
                <p className="subhead" style={{ margin: 0 }}>
                  {t("commerce.paymentFailedBody")}
                </p>
              </>
            ) : payment.data.status === "REFUNDED" ? (
              <>
                <h1 className="title">{t("commerce.paymentRefunded")}</h1>
                <p className="subhead" style={{ margin: 0 }}>
                  {t("commerce.refundComplete")}
                </p>
              </>
            ) : (
              <>
                <h1 className="title">{t("commerce.waitConfirmation")}</h1>
                <p className="subhead" style={{ margin: 0 }}>
                  {t("commerce.pollPayment")}
                </p>
              </>
            )}
            <span className={statusClass(payment.data.status)}>{statusLabel(payment.data.status)}</span>
            <p className="muted">{payment.data.provider === "stub" ? t("commerce.localProvider") : payment.data.provider === "stripe" ? t("commerce.stripeProvider") : t("commerce.paymentRecord")}</p>
            {payment.data.provider === "stub" && config.data?.payments.mode === "LOCAL_SIMULATION"
              && ["CREATED", "PENDING"].includes(payment.data.status) ? (
                <button className="button buttonDark" disabled={simulation.isPending} onClick={() => simulation.mutate()}>
                  {simulation.isPending ? t("commerce.simulating") : t("commerce.simulateSuccess")}
                </button>
              ) : null}
            {simulation.error ? <p className="errorText">{errorMessage(simulation.error)}</p> : null}
            <p className="mono" style={{ margin: 0 }}>
              {formatPrice(payment.data.amount, payment.data.currency)}
            </p>
            {payment.data.externalPaymentId ? (
              <p className="mono muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                {t("commerce.externalPayment", { id: payment.data.externalPaymentId })}
              </p>
            ) : null}
            <div className="toolbar">
              {payment.data.status === "SUCCEEDED" ? (
                <Link className="button buttonDark" href={`/orders/${payment.data.orderId}`}>
                  {t("commerce.openOrder")}
                </Link>
              ) : null}
              {failedStatuses.includes(payment.data.status) ? (
                <Link className="button buttonDark" href={`/checkout/payment?orderId=${payment.data.orderId}`}>
                  {t("commerce.retryPayment")}
                </Link>
              ) : null}
              {(payment.data.status === "CREATED" || payment.data.status === "PENDING") &&
              isStripeCheckoutUrl(payment.data.paymentUrl) ? (
                <a className="button buttonDark" href={payment.data.paymentUrl} rel="noopener noreferrer">
                  {t("commerce.stripeCheckout")}
                </a>
              ) : null}
              <Link className="button" href={`/orders/${payment.data.orderId}`}>
                {t("commerce.order")}
              </Link>
            </div>
          </section>
        )}
      </main>
    </Protected>
  );
}
