"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { orderApi, shippingApi, userApi } from "@/lib/api/shop";
import type { ShippingMethod } from "@/lib/api/types";

export const shippingSchema = z.object({
  fullName: z.string().min(2, "min:2").max(128, "max:128"),
  line1: z.string().min(2, "min:2").max(128, "max:128"),
  line2: z.string().max(128, "max:128").optional(),
  city: z.string().min(2, "min:2").max(64, "max:64"),
  state: z.string().min(2, "min:2").max(64, "max:64"),
  postalCode: z.string().min(2, "min:2").max(16, "max:16"),
  country: z.string().min(2, "min:2").max(64, "max:64"),
  method: z.enum(["DHL", "STANDARD_POST", "LOCAL_PICKUP"])
});

type ShippingForm = z.infer<typeof shippingSchema>;

const methods: ShippingMethod[] = ["DHL", "STANDARD_POST", "LOCAL_PICKUP"];

export function ShippingPage() {
  const { t, errorMessage, formatPrice, formatNumber, shippingLabel } = useI18n();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const orderId = Number(params.get("orderId"));

  const order = useSessionQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderApi.get(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0
  });
  const addresses = useSessionQuery({ queryKey: ["addresses"], queryFn: userApi.addresses });

  const form = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: t("commerce.germany"),
      method: "STANDARD_POST"
    }
  });
  const chosenMethod = form.watch("method");

  const submitShipping = useSessionMutation({
    mutationFn: async (values: ShippingForm, context) => {
      const { method, ...address } = values;
      await shippingApi.setAddress({ orderId, ...address });
      context.assertCurrent();
      return shippingApi.setMethod(orderId, method);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipment", orderId] });
    }
  });

  function prefillFromAddress(id: string) {
    const address = addresses.data?.find((entry) => entry.id === Number(id));
    if (!address) return;
    form.reset({
      ...form.getValues(),
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state ?? "",
      postalCode: address.postalCode,
      country: address.country
    });
  }

  function fieldError(name: keyof ShippingForm) {
    const message = form.formState.errors[name]?.message;
    if (!message) return null;
    const [bound, count] = message.split(":");
    const translated = bound === "min" ? t("commerce.validationMin", { min: formatNumber(Number(count)) }) :
      bound === "max" ? t("commerce.validationMax", { max: formatNumber(Number(count)) }) :
      name === "method" ? t("commerce.chooseShipping") : errorMessage(message);
    return <span className="errorText">{translated}</span>;
  }

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <main className="page">
        <EmptyState title={t("commerce.missingOrder")} body={t("commerce.openShippingFromCheckout")}>
          <Link className="button buttonDark" href="/checkout">
            {t("commerce.backCheckout")}
          </Link>
        </EmptyState>
      </main>
    );
  }

  return (
    <Protected>
      <main className="page">
        <div className="stack" style={{ gap: 8, marginBottom: 24 }}>
          <span className="kicker">{t("commerce.step2")}</span>
          <h1 className="title">{t("commerce.whereShipping")}</h1>
          <p className="muted">{t("commerce.fictionalAddress")}</p>
          {order.data ? (
            <p className="mono muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              {t("commerce.orderNumber", { number: order.data.orderNumber })}
            </p>
          ) : null}
        </div>
        <section className="split">
          <div className="card stack" style={{ padding: 24 }}>
            {addresses.data?.length ? (
              <label className="label">
                {t("commerce.savedAddress")}
                <select className="select" defaultValue="" onChange={(event) => prefillFromAddress(event.target.value)}>
                  <option value="">{t("commerce.pickAddress")}</option>
                  {addresses.data.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.fullName}, {address.line1}, {address.city} ({address.country})
                      {address.defaultAddress ? t("commerce.defaultSuffix") : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <form className="stack" onSubmit={form.handleSubmit((values) => submitShipping.mutate(values))}>
              <label className="label">
                {t("commerce.fullName")}
                <input className="input" autoComplete="name" {...form.register("fullName")} />
                {fieldError("fullName")}
              </label>
              <label className="label">
                {t("commerce.line1")}
                <input className="input" autoComplete="address-line1" {...form.register("line1")} />
                {fieldError("line1")}
              </label>
              <label className="label">
                {t("commerce.line2")}
                <input className="input" autoComplete="address-line2" {...form.register("line2")} />
                {fieldError("line2")}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                <label className="label">
                  {t("commerce.city")}
                  <input className="input" autoComplete="address-level2" {...form.register("city")} />
                  {fieldError("city")}
                </label>
                <label className="label">
                  {t("commerce.state")}
                  <input className="input" autoComplete="address-level1" {...form.register("state")} />
                  {fieldError("state")}
                </label>
                <label className="label">
                  {t("commerce.postalCode")}
                  <input className="input" autoComplete="postal-code" {...form.register("postalCode")} />
                  {fieldError("postalCode")}
                </label>
                <label className="label">
                  {t("commerce.country")}
                  <input className="input" autoComplete="country-name" {...form.register("country")} />
                  {fieldError("country")}
                </label>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <span className="kicker">{t("commerce.shippingMethod")}</span>
                <div className="chipRow">
                  {methods.map((method) => (
                    <label key={method} className="chip" data-selected={chosenMethod === method}>
                      <input
                        type="radio"
                        value={method}
                        {...form.register("method")}
                        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                      />
                      {shippingLabel(method)}
                    </label>
                  ))}
                </div>
                {fieldError("method")}
              </div>
              {submitShipping.error ? (
                <p className="errorText" style={{ margin: 0 }}>
                  {errorMessage(submitShipping.error)}
                </p>
              ) : null}
              <button className="button buttonDark" disabled={submitShipping.isPending}>
                {submitShipping.isPending ? t("commerce.saving") : t("commerce.saveShipping")}
              </button>
            </form>
          </div>

          <aside className="panelInk stack" style={{ position: "sticky", top: 84, padding: 28, gap: 12 }}>
            <h2 className="subtitle" style={{ margin: 0 }}>
              {t("commerce.orderTotal")}
            </h2>
            {order.data ? (
              <div className="stack" style={{ gap: 8 }}>
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
                <hr className="divider" style={{ borderColor: "color-mix(in oklab, var(--cream-on-dark) 18%, transparent)" }} />
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span>{t("commerce.total")}</span>
                  <span className="price" style={{ fontSize: "1.6rem" }}>
                    {formatPrice(order.data.paymentAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t("commerce.saveToSeeShipping")}
              </p>
            )}
            {order.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(order.error)}</p> : null}
            {submitShipping.isSuccess ? (
              <Link className="button buttonAccent" href={`/checkout/payment?orderId=${orderId}`}>
                {t("commerce.continuePayment")}
              </Link>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                {t("commerce.paymentAfterShipping")}
              </p>
            )}
          </aside>
        </section>
      </main>
    </Protected>
  );
}
