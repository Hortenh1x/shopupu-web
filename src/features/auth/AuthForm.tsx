"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  passwordConfirm: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const auth = useAuth();
  const router = useRouter();
  const [registered, setRegistered] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", passwordConfirm: "" }
  });

  async function submit(values: FormValues) {
    if (mode === "register") {
      if (!values.passwordConfirm || values.passwordConfirm.length < 8) {
        form.setError("passwordConfirm", { message: "Confirm your password" });
        return;
      }
      if (values.password !== values.passwordConfirm) {
        form.setError("passwordConfirm", { message: "Passwords do not match" });
        return;
      }
    }
    try {
      if (mode === "login") {
        await auth.login(values.email, values.password);
        router.push("/catalog");
      } else {
        await auth.register(values.email, values.password, values.passwordConfirm ?? "");
        setRegistered(true);
      }
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

  if (registered) {
    return (
      <main className="page">
        <section className="brutal stack" style={{ maxWidth: 520, margin: "40px auto", padding: "40px 32px", gap: 12 }}>
          <h1 className="title">
            You are <span className="mark">in</span>.
          </h1>
          <p className="subhead" style={{ margin: 0 }}>
            Check your email to verify the address.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            You are already signed in and can start shopping. Once the verification email arrives, follow the
            link or paste the token on the verification page.
          </p>
          <div className="toolbar" style={{ marginTop: 8 }}>
            <Link className="button buttonDark" href="/catalog">
              Go to catalog
            </Link>
            <Link className="button" href="/verify-email">
              Verify email
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 18 }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">{mode === "login" ? "Welcome back" : "New account"}</span>
          <h1 className="title">{mode === "login" ? "Sign in." : "Create your account."}</h1>
        </div>
        <form className="stack" onSubmit={form.handleSubmit(submit)}>
          <label className="label">
            Email
            <input className="input" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <span className="errorText">{form.formState.errors.email.message}</span>
            ) : null}
          </label>
          <label className="label">
            Password
            <input
              className="input"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <span className="errorText">{form.formState.errors.password.message}</span>
            ) : null}
          </label>
          {mode === "register" ? (
            <label className="label">
              Confirm password
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                {...form.register("passwordConfirm")}
              />
              {form.formState.errors.passwordConfirm ? (
                <span className="errorText">{form.formState.errors.passwordConfirm.message}</span>
              ) : null}
            </label>
          ) : null}
          {form.formState.errors.root ? (
            <p className="errorText" style={{ margin: 0 }}>
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <button className="button buttonDark" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "One moment..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <GoogleSignInButton
          onCredential={async (idToken) => {
            try {
              await auth.loginWithGoogle(idToken);
              router.push("/catalog");
            } catch (error) {
              form.setError("root", {
                message: error instanceof ApiError || error instanceof Error ? error.message : "Google sign-in failed"
              });
            }
          }}
        />
        <div className="toolbar" style={{ justifyContent: "space-between", fontSize: "0.9rem" }}>
          {mode === "login" ? (
            <>
              <Link className="muted" style={{ textDecoration: "underline" }} href="/forgot-password">
                Forgot password?
              </Link>
              <Link className="muted" style={{ textDecoration: "underline" }} href="/register">
                New here? Create account
              </Link>
            </>
          ) : (
            <Link className="muted" style={{ textDecoration: "underline" }} href="/login">
              Already have an account? Sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
