"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Protected } from "@/components/layout/Protected";
import { shippingApi } from "@/lib/api/shop";

const schema = z.object({
  fullName: z.string().min(2).max(128),
  line1: z.string().min(2).max(128),
  line2: z.string().max(128).optional(),
  city: z.string().min(2).max(64),
  state: z.string().min(2).max(64),
  postalCode: z.string().min(2).max(16),
  country: z.string().min(2).max(64),
  method: z.string().min(2)
});

type ShippingForm = z.infer<typeof schema>;

export function ShippingPage() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = Number(params.get("orderId"));
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
      await shippingApi.setAddress({ orderId, ...values });
      return shippingApi.setMethod({ orderId, method: values.method });
    },
    onSuccess: () => router.push(`/checkout/payment?orderId=${orderId}`)
  });

  return (
    <Protected>
      <main className="page">
        <section className="brutal stack" style={{ padding: 28 }}>
          <h1 className="title">Shipping</h1>
          <form className="stack" onSubmit={form.handleSubmit((values) => submitShipping.mutate(values))}>
            <div className="toolbar">
              <label className="label">
                Full name
                <input className="input" {...form.register("fullName")} />
              </label>
              <label className="label">
                Method
                <select className="select" {...form.register("method")}>
                  <option value="STANDARD_POST">Standard post</option>
                  <option value="DHL">DHL</option>
                  <option value="LOCAL_PICKUP">Local pickup</option>
                </select>
              </label>
            </div>
            <label className="label">
              Line 1
              <input className="input" {...form.register("line1")} />
            </label>
            <label className="label">
              Line 2
              <input className="input" {...form.register("line2")} />
            </label>
            <div className="toolbar">
              <label className="label">
                City
                <input className="input" {...form.register("city")} />
              </label>
              <label className="label">
                State
                <input className="input" {...form.register("state")} />
              </label>
              <label className="label">
                Postal code
                <input className="input" {...form.register("postalCode")} />
              </label>
              <label className="label">
                Country
                <input className="input" {...form.register("country")} />
              </label>
            </div>
            {submitShipping.error ? <p className="muted">{submitShipping.error.message}</p> : null}
            <button className="button buttonDark" disabled={submitShipping.isPending || !orderId}>
              Save shipping
            </button>
          </form>
        </section>
      </main>
    </Protected>
  );
}
