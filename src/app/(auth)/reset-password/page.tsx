"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { authApi } from "@/lib/api/shop";
import { newPasswordError } from "@/lib/auth/passwordPolicy";

function ResetPasswordForm() {
  const { t, errorMessage } = useI18n();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(token.trim(), password)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const issue = newPasswordError(password);
    setPolicyError(issue);
    if (issue) return;
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
        <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 16 }}>
          <h1 className="title">{t("auth.password")} <span className="mark">{t("auth.updatedWord")}</span>.</h1>
          <p className="subhead">{t("auth.resetSuccess")}</p>
          <Link className="button buttonDark" href="/login">
            {t("auth.goLogin")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 480, margin: "40px auto", padding: "40px 32px", gap: 16 }}>
        <h1 className="title">{t("auth.resetTitle")}</h1>
        <form className="stack" onSubmit={submit}>
          <label className="label">
            {t("auth.resetCode")}
            <input className="input" required value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          <label className="label">
            {t("auth.newPassword")}
            <input
              className="input"
              type="password"
              required
              minLength={15}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="label">
            {t("auth.confirmNewPassword")}
            <input
              className="input"
              type="password"
              required
              minLength={15}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          <p className="muted">{t("auth.resetPolicy")}</p>
          {policyError ? <p role="alert" className="errorText">{errorMessage(policyError)}</p> : null}
          {mismatch ? <p className="errorText" style={{ margin: 0 }}>{t("auth.passwordMismatchPeriod")}</p> : null}
          {reset.error ? <p className="errorText" style={{ margin: 0 }}>{errorMessage(reset.error)}</p> : null}
          <button className="button buttonDark" disabled={reset.isPending}>
            {t("auth.setNewPassword")}
          </button>
        </form>
        <p className="muted">
          <Link href="/forgot-password">{t("auth.requestNewCode")}</Link>
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
