"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { authApi } from "@/lib/api/shop";

function ResetPasswordForm() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(token.trim(), password)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    reset.mutate();
  }

  if (reset.isSuccess) {
    return (
      <main className="page">
        <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 14 }}>
          <h1 className="title">Password <span className="mark">updated</span>.</h1>
          <p className="subhead">Your password has been reset. Login with the new password.</p>
          <Link className="button buttonDark" href="/login">
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 14 }}>
        <h1 className="title">Reset password.</h1>
        <form className="stack" onSubmit={submit}>
          <label className="label">
            Reset code
            <input className="input" required value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          <label className="label">
            New password
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="label">
            Confirm new password
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          {mismatch ? <p className="errorText" style={{ margin: 0 }}>Passwords do not match.</p> : null}
          {reset.error ? <p className="errorText" style={{ margin: 0 }}>{(reset.error as Error).message}</p> : null}
          <button className="button buttonDark" disabled={reset.isPending}>
            Set new password
          </button>
        </form>
        <p className="muted">
          <Link href="/forgot-password">Request a new code</Link>
        </p>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><Skeleton /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
