"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { authApi, storefrontApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";

function VerifyEmailForm() {
  const { t, errorMessage } = useI18n();
  const auth = useAuth();
  const config = useQuery({ queryKey: ["storefront-config"], queryFn: storefrontApi.config });
  const unavailable = config.data?.email.available === false;
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
  const resend = useSessionMutation({
    mutationFn: () => authApi.resendVerification()
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    verify.mutate();
  }

  if (verify.isSuccess) {
    return (
      <main className="page">
        <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 16 }}>
          <h1 className="title">{t("auth.email")} <span className="mark">{t("profile.verified")}</span>.</h1>
          <p className="subhead">{t("auth.emailConfirmed")}</p>
          <Link className="button buttonDark" href="/">
            {t("auth.backShop")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 16 }}>
        <h1 className="title">{t("auth.verifyEmailTitle")}</h1>
        <p className="muted">{t("auth.pasteVerification")}</p>
        <form className="stack" onSubmit={submit}>
          <label className="label">
            {t("auth.verificationToken")}
            <input className="input" required value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          {verify.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(verify.error)}</p> : null}
          <button className="button buttonDark" disabled={verify.isPending}>
            {t("auth.verify")}
          </button>
        </form>
        {auth.isReady && auth.isAuthenticated ? (
          <div className="card stack">
            <p className="muted">{unavailable ? t("auth.mailDisabledOrders") : t("auth.resendFor", { email: auth.user?.email ?? "" })}</p>
            <div className="toolbar">
              <button className="button" disabled={resend.isPending || unavailable} onClick={() => resend.mutate()}>
                {t("auth.resend")}
              </button>
              {resend.isSuccess ? <span className="status statusOk">{t("auth.requested")}</span> : null}
            </div>
            {resend.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(resend.error)}</p> : null}
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
