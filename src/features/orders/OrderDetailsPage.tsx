"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Protected } from "@/components/layout/Protected";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { orderApi, shippingApi } from "@/lib/api/shop";

const CANCELLABLE = new Set(["CREATED", "PENDING_PAYMENT"]);
const PAYABLE = new Set(["CREATED", "PENDING_PAYMENT"]);

export function OrderDetailsPage({ orderId }: { orderId: number }) {
  const { t, errorMessage, formatPrice, formatNumber, formatDate, shippingLabel } = useI18n();
  const queryClient = useQueryClient();
  const order = useSessionQuery({ queryKey: ["order", orderId], queryFn: () => orderApi.get(orderId) });
  const shipment = useSessionQuery({
    queryKey: ["shipment", orderId],
    queryFn: () => shippingApi.get(orderId),
    retry: false
  });
  const cancel = useSessionMutation({
    mutationFn: () => orderApi.cancel(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order", orderId] })
  });

  if (order.isLoading) {
    return (
      <main className="page">
        <Skeleton lines={5} />
      </main>
    );
  }

  if (!order.data) {
    return (
      <main className="page">
        <EmptyState title={t("commerce.orderNotFound")} body={t("commerce.otherAccount")}>
          <Link className="button buttonDark" href="/orders">
            {t("commerce.backOrders")}
          </Link>
        </EmptyState>
      </main>
    );
  }

  const data = order.data;

  return (
    <Protected>
      <main className="page">
        <section className="split">
          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 8 }}>
              <span className="kicker">{t("commerce.order")}</span>
              <h1 className="title mono" style={{ letterSpacing: "-0.01em" }}>
                {data.orderNumber}
              </h1>
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                {t("commerce.placed", { date: data.createdAt ? formatDate(data.createdAt, { dateStyle: "medium", timeStyle: "short" }) : "-" })}
                {data.updatedAt ? t("commerce.updated", { date: formatDate(data.updatedAt, { dateStyle: "medium", timeStyle: "short" }) }) : ""}
              </p>
            </div>
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
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="stack" style={{ gap: 4 }}>
                        <Link href={`/products/${item.productId}`} style={{ fontWeight: 600 }}>
                          {item.title}
                        </Link>
                        <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                          {[item.brand, item.size, item.color, item.sku].filter(Boolean).join(" · ")}
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

            <div className="card stack" style={{ gap: 12 }}>
              <h2 className="subtitle" style={{ margin: 0 }}>
                {t("commerce.shippingTitle")}
              </h2>
              {shipment.data?.method ? (
                <>
                  <div className="toolbar" style={{ gap: 12 }}>
                    <StatusBadge value={shipment.data.shippingStatus ?? "PENDING"} />
                    <span className="muted">{shippingLabel(shipment.data.method)}</span>
                    {shipment.data.trackingNumber ? (
                      <span className="mono" style={{ fontSize: "0.85rem" }}>
                        {t("commerce.tracking", { number: shipment.data.trackingNumber })}
                      </span>
                    ) : null}
                  </div>
                  {shipment.data.address?.line1 ? (
                    <p className="muted" style={{ margin: 0 }}>
                      {[
                        shipment.data.address.fullName,
                        shipment.data.address.line1,
                        shipment.data.address.line2,
                        shipment.data.address.city,
                        shipment.data.address.postalCode,
                        shipment.data.address.country
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  {t("commerce.shippingNotConfigured")}
                </p>
              )}
            </div>
          </div>

          <aside className="card stack" style={{ position: "sticky", top: 84, padding: 24, gap: 12 }}>
            <StatusBadge value={data.status} />
            <div className="stack" style={{ gap: 8 }}>
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span className="muted">{t("commerce.subtotal")}</span>
                <span className="price">{formatPrice(data.subtotalAmount)}</span>
              </div>
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span className="muted">{t("commerce.shipping")}</span>
                <span className="price">{formatPrice(data.shippingAmount)}</span>
              </div>
              {data.discountAmount > 0 ? (
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">{t("commerce.discount")}{data.promoCode ? ` (${data.promoCode})` : ""}</span>
                  <span className="price">&minus;{formatPrice(data.discountAmount)}</span>
                </div>
              ) : null}
              <hr className="divider" />
              <div className="toolbar" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>{t("commerce.total")}</span>
                <span className="price" style={{ fontSize: "1.6rem" }}>
                  {formatPrice(data.paymentAmount)}
                </span>
              </div>
            </div>
            {PAYABLE.has(data.status) ? (
              <Link className="button buttonDark" href={`/checkout/shipping?orderId=${data.id}`}>
                {data.shippingAmount > 0 || shipment.data?.method ? t("commerce.continuePayment") : t("commerce.setupAndPay")}
              </Link>
            ) : null}
            {CANCELLABLE.has(data.status) ? (
              <ConfirmButton
                label={cancel.isPending ? t("commerce.cancelling") : t("commerce.cancelOrder")}
                confirmLabel={t("commerce.cancelConfirm")}
                keepLabel={t("commerce.keepOrder")}
                disabled={cancel.isPending}
                onConfirm={() => cancel.mutate()}
              />
            ) : null}
            {cancel.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(cancel.error)}</p> : null}
          </aside>
        </section>
      </main>
    </Protected>
  );
}
