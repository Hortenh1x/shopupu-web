"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { authApi, storefrontApi } from "@/lib/api/shop";

export default function Page() {
  const { t, errorMessage } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const config = useQuery({ queryKey: ["storefront-config"], queryFn: storefrontApi.config });
  const unavailable = config.data?.email.available === false;
  const request = useMutation({
    mutationFn: (value: string) => authApi.forgotPassword(value),
    // the endpoint is intentionally silent about whether the account exists
    onSuccess: () => setSent(true)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    request.mutate(email.trim());
  }

  if (sent) {
    return (
      <main className="page">
        <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 16 }}>
          <h1 className="title">{t("auth.inboxPrefix")}<span className="mark">{t("auth.inboxWord")}</span>.</h1>
          <p className="subhead">{t("auth.resetRequested")}</p>
          <div className="toolbar">
            <Link className="button buttonDark" href="/reset-password">
              {t("auth.haveCode")}
            </Link>
            <Link className="button" href="/login">
              {t("auth.backLogin")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 16 }}>
        <h1 className="title">{t("auth.forgotTitle")}</h1>
        <p className="muted">{unavailable ? t("auth.resetUnavailable") : t("auth.requestReset")}</p>
        <form className="stack" onSubmit={submit}>
          <label className="label">
            {t("auth.email")}
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button className="button buttonDark" disabled={request.isPending || unavailable}>
            {t("auth.sendReset")}
          </button>
        </form>
        {request.error ? <p role="alert" className="errorText">{errorMessage(request.error)}</p> : null}
        <p className="muted">
          <Link href="/login">{t("auth.backLogin")}</Link>
        </p>
      </section>
    </main>
  );
}
