"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Protected } from "@/components/layout/Protected";
import { EmptyState } from "@/components/ui/EmptyState";
import { orderApi, shippingApi, userApi } from "@/lib/api/shop";
import type { ShippingMethod } from "@/lib/api/types";

const schema = z.object({
  fullName: z.string().min(2).max(128),
  line1: z.string().min(2).max(128),
  line2: z.string().max(128).optional(),
  city: z.string().min(2).max(64),
  state: z.string().min(2).max(64),
  postalCode: z.string().min(2).max(16),
  country: z.string().min(2).max(64),
  method: z.enum(["DHL", "STANDARD_POST", "LOCAL_PICKUP"])
});

type ShippingForm = z.infer<typeof schema>;

const methodLabels: Record<ShippingMethod, string> = {
  DHL: "DHL",
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
    resolver: zodResolver(schema),
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
    return message ? <span className="muted">{message}</span> : null;
  }

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <EmptyState title="Missing order" body="Open shipping from checkout so the order id is present.">
        <Link className="button buttonDark" href="/checkout">
          Back to checkout
        </Link>
      </EmptyState>
    );
  }

  return (
    <Protected>
      <main className="page">
        <section className="split">
          <div className="brutal stack" style={{ padding: 28 }}>
            <h1 className="title">Shipping</h1>
            {order.data ? (
              <p className="subhead muted">
                Order {order.data.orderNumber} - {order.data.subtotalAmount.toFixed(2)} EUR items
              </p>
            ) : null}
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
                <input className="input" {...form.register("fullName")} />
                {fieldError("fullName")}
              </label>
              <label className="label">
                Line 1
                <input className="input" {...form.register("line1")} />
                {fieldError("line1")}
              </label>
              <label className="label">
                Line 2
                <input className="input" {...form.register("line2")} />
                {fieldError("line2")}
              </label>
              <div className="toolbar">
                <label className="label">
                  City
                  <input className="input" {...form.register("city")} />
                  {fieldError("city")}
                </label>
                <label className="label">
                  State
                  <input className="input" {...form.register("state")} />
                  {fieldError("state")}
                </label>
                <label className="label">
                  Postal code
                  <input className="input" {...form.register("postalCode")} />
                  {fieldError("postalCode")}
                </label>
                <label className="label">
                  Country
                  <input className="input" {...form.register("country")} />
                  {fieldError("country")}
                </label>
              </div>
              <div className="stack">
                <span className="label">Shipping method</span>
                {(Object.keys(methodLabels) as ShippingMethod[]).map((method) => (
                  <label key={method} className="label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="radio" value={method} {...form.register("method")} />
                    {methodLabels[method]}
                  </label>
                ))}
                {fieldError("method")}
              </div>
              {submitShipping.error ? <p className="muted">{(submitShipping.error as Error).message}</p> : null}
              <button className="button buttonDark" disabled={submitShipping.isPending}>
                Save shipping
              </button>
            </form>
          </div>
          <aside className="card stack">
            <h2 className="headline">Order total</h2>
            {submitShipping.data ? (
              <>
                <p>Method: {submitShipping.data.method ? methodLabels[submitShipping.data.method] : "-"}</p>
                <p>Shipping cost: {Number(submitShipping.data.shippingCost ?? 0).toFixed(2)} EUR</p>
              </>
            ) : (
              <p className="muted">Save the address and method to see the shipping cost.</p>
            )}
            {order.data ? (
              <>
                <p>Subtotal: {order.data.subtotalAmount.toFixed(2)} EUR</p>
                <p>Shipping: {order.data.shippingAmount.toFixed(2)} EUR</p>
                {order.data.discountAmount > 0 ? (
                  <p>
                    Discount{order.data.promoCode ? ` (${order.data.promoCode})` : ""}: -
                    {order.data.discountAmount.toFixed(2)} EUR
                  </p>
                ) : null}
                <strong style={{ fontSize: "1.5rem" }}>Total: {order.data.paymentAmount.toFixed(2)} EUR</strong>
              </>
            ) : null}
            {order.error ? <p className="muted">{(order.error as Error).message}</p> : null}
            {submitShipping.isSuccess ? (
              <Link className="button buttonDark" href={`/checkout/payment?orderId=${orderId}`}>
                Continue to payment
              </Link>
            ) : null}
          </aside>
        </section>
      </main>
    </Protected>
  );
}
