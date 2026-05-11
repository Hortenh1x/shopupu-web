"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const auth = useAuth();
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });

  async function submit(values: FormValues) {
    try {
      if (mode === "login") {
        await auth.login(values.email, values.password);
      } else {
        await auth.register(values.email, values.password);
      }
      router.push("/catalog");
    } catch (error) {
      form.reset(values, {
        keepDirty: true,
        keepTouched: true,
        keepSubmitCount: true
      });
      form.setError("root", {
        message: error instanceof ApiError || error instanceof Error ? error.message : "Authentication failed"
      });
    }
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 520, margin: "40px auto", padding: 28 }}>
        <h1 className="title">{mode === "login" ? "Login" : "Register"}</h1>
        <form className="stack" onSubmit={form.handleSubmit(submit)}>
          <label className="label">
            Email
            <input className="input" {...form.register("email")} />
            {form.formState.errors.email ? <span className="muted">{form.formState.errors.email.message}</span> : null}
          </label>
          <label className="label">
            Password
            <input className="input" type="password" {...form.register("password")} />
            {form.formState.errors.password ? <span className="muted">{form.formState.errors.password.message}</span> : null}
          </label>
          {form.formState.errors.root ? <p className="muted">{form.formState.errors.root.message}</p> : null}
          <button className="button buttonDark" disabled={form.formState.isSubmitting}>
            {mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
