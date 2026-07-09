"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { authApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

function VerifyEmailForm() {
  const auth = useAuth();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(token.trim()),
    onSuccess: () => {
      if (auth.isAuthenticated) {
        // refresh the emailVerified flag in the session (best effort)
        auth.reloadUser().catch(() => undefined);
      }
    }
  });
  const resend = useMutation({
    mutationFn: () => authApi.resendVerification()
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    verify.mutate();
  }

  if (verify.isSuccess) {
    return (
      <main className="page">
        <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 14 }}>
          <h1 className="title">Email <span className="mark">verified</span>.</h1>
          <p className="subhead">Your email address is confirmed. Thank you!</p>
          <Link className="button buttonDark" href="/">
            Back to shop
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 14 }}>
        <h1 className="title">Verify email.</h1>
        <p className="muted">Paste the verification token from the email we sent you.</p>
        <form className="stack" onSubmit={submit}>
          <label className="label">
            Verification token
            <input className="input" required value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          {verify.error ? <p className="errorText" style={{ margin: 0 }}>{(verify.error as Error).message}</p> : null}
          <button className="button buttonDark" disabled={verify.isPending}>
            Verify
          </button>
        </form>
        {auth.isReady && auth.isAuthenticated ? (
          <div className="card stack">
            <p className="muted">Lost the email? We can send a new verification link to {auth.user?.email}.</p>
            <div className="toolbar">
              <button className="button" disabled={resend.isPending} onClick={() => resend.mutate()}>
                Resend verification email
              </button>
              {resend.isSuccess ? <span className="status statusOk">sent</span> : null}
            </div>
            {resend.error ? <p className="errorText" style={{ margin: 0 }}>{(resend.error as Error).message}</p> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><Skeleton /></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
