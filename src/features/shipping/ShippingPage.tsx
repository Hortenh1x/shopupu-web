"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/features/catalog/ProductCard";
import { orderApi, shippingApi, userApi } from "@/lib/api/shop";
import type { ShippingMethod } from "@/lib/api/types";

export const shippingSchema = z.object({
  fullName: z.string().min(2).max(128),
  line1: z.string().min(2).max(128),
  line2: z.string().max(128).optional(),
  city: z.string().min(2).max(64),
  state: z.string().min(2).max(64),
  postalCode: z.string().min(2).max(16),
  country: z.string().min(2).max(64),
  method: z.enum(["DHL", "STANDARD_POST", "LOCAL_PICKUP"])
});

type ShippingForm = z.infer<typeof shippingSchema>;

const methodLabels: Record<ShippingMethod, string> = {
  DHL: "DHL courier",
  STANDARD_POST: "Standard post",
  LOCAL_PICKUP: "Local pickup"
};

export function ShippingPage() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const orderId = Number(params.get("orderId"));

  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderApi.get(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0
  });
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: userApi.addresses });

  const form = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Germany",
      method: "STANDARD_POST"
    }
  });
  const chosenMethod = form.watch("method");

  const submitShipping = useMutation({
    mutationFn: async (values: ShippingForm) => {
      const { method, ...address } = values;
      await shippingApi.setAddress({ orderId, ...address });
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
    return message ? <span className="errorText">{message}</span> : null;
  }

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <main className="page">
        <EmptyState title="Missing order" body="Open shipping from checkout so the order id is present.">
          <Link className="button buttonDark" href="/checkout">
            Back to checkout
          </Link>
        </EmptyState>
      </main>
    );
  }

  return (
    <Protected>
      <main className="page">
        <div className="stack" style={{ gap: 6, marginBottom: 24 }}>
          <span className="kicker">Checkout · step 2 of 3</span>
          <h1 className="title">Where should it go?</h1>
          {order.data ? (
            <p className="mono muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Order {order.data.orderNumber}
            </p>
          ) : null}
        </div>
        <section className="split">
          <div className="card stack" style={{ padding: 24 }}>
            {addresses.data?.length ? (
              <label className="label">
                Use saved address
                <select className="select" defaultValue="" onChange={(event) => prefillFromAddress(event.target.value)}>
                  <option value="">Pick a saved address...</option>
                  {addresses.data.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.fullName}, {address.line1}, {address.city} ({address.country})
                      {address.defaultAddress ? " - default" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <form className="stack" onSubmit={form.handleSubmit((values) => submitShipping.mutate(values))}>
              <label className="label">
                Full name
                <input className="input" autoComplete="name" {...form.register("fullName")} />
                {fieldError("fullName")}
              </label>
              <label className="label">
                Address line 1
                <input className="input" autoComplete="address-line1" {...form.register("line1")} />
                {fieldError("line1")}
              </label>
              <label className="label">
                Address line 2
                <input className="input" autoComplete="address-line2" {...form.register("line2")} />
                {fieldError("line2")}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                <label className="label">
                  City
                  <input className="input" autoComplete="address-level2" {...form.register("city")} />
                  {fieldError("city")}
                </label>
                <label className="label">
                  State
                  <input className="input" autoComplete="address-level1" {...form.register("state")} />
                  {fieldError("state")}
                </label>
                <label className="label">
                  Postal code
                  <input className="input" autoComplete="postal-code" {...form.register("postalCode")} />
                  {fieldError("postalCode")}
                </label>
                <label className="label">
                  Country
                  <input className="input" autoComplete="country-name" {...form.register("country")} />
                  {fieldError("country")}
                </label>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <span className="kicker">Shipping method</span>
                <div className="chipRow">
                  {(Object.keys(methodLabels) as ShippingMethod[]).map((method) => (
                    <label key={method} className="chip" data-selected={chosenMethod === method}>
                      <input
                        type="radio"
                        value={method}
                        {...form.register("method")}
                        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                      />
                      {methodLabels[method]}
                    </label>
                  ))}
                </div>
                {fieldError("method")}
              </div>
              {submitShipping.error ? (
                <p className="errorText" style={{ margin: 0 }}>
                  {(submitShipping.error as Error).message}
                </p>
              ) : null}
              <button className="button buttonDark" disabled={submitShipping.isPending}>
                {submitShipping.isPending ? "Saving..." : "Save shipping"}
              </button>
            </form>
          </div>

          <aside className="panelInk stack" style={{ position: "sticky", top: 84, padding: 28, gap: 12 }}>
            <h2 className="subtitle" style={{ margin: 0 }}>
              Order total.
            </h2>
            {order.data ? (
              <div className="stack" style={{ gap: 8 }}>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Subtotal</span>
                  <span className="price">{formatPrice(order.data.subtotalAmount)}</span>
                </div>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Shipping</span>
                  <span className="price">{formatPrice(order.data.shippingAmount)}</span>
                </div>
                {order.data.discountAmount > 0 ? (
                  <div className="toolbar" style={{ justifyContent: "space-between" }}>
                    <span className="muted">Discount{order.data.promoCode ? ` (${order.data.promoCode})` : ""}</span>
                    <span className="price">&minus;{formatPrice(order.data.discountAmount)}</span>
                  </div>
                ) : null}
                <hr className="divider" style={{ borderColor: "color-mix(in oklab, var(--cream-on-dark) 18%, transparent)" }} />
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span>Total</span>
                  <span className="price" style={{ fontSize: "1.6rem" }}>
                    {formatPrice(order.data.paymentAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Save the address and method to see the shipping cost.
              </p>
            )}
            {order.error ? <p className="errorText" style={{ margin: 0 }}>{(order.error as Error).message}</p> : null}
            {submitShipping.isSuccess ? (
              <Link className="button buttonAccent" href={`/checkout/payment?orderId=${orderId}`}>
                Continue to payment
              </Link>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Payment follows once shipping is saved.
              </p>
            )}
          </aside>
        </section>
      </main>
    </Protected>
  );
}
