"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AuthChallenge, AuthResult, AuthenticatedResult, MfaEnrollment } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { newPasswordError } from "@/lib/auth/passwordPolicy";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";

const schema = z.object({ email: z.string().email("auth.emailInvalid"), password: z.string().min(1, "auth.passwordRequired"), passwordConfirm: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t, errorMessage, formatDate } = useI18n();
  const auth = useAuth();
  const router = useRouter();
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [pendingTokens, setPendingTokens] = useState<AuthenticatedResult | null>(null);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mfaError, setMfaError] = useState<unknown>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", passwordConfirm: "" } });

  async function handleResult(result: AuthResult, destination = "/catalog") {
    if (result.status === "AUTHENTICATED") {
      if (result.recoveryCodes?.length) {
        setPendingTokens(result); setEnrollment(null); setChallenge(null); setCode("");
      } else router.push(destination);
      return;
    }
    setChallenge(result); setEnrollment(null); setCode(""); setUseRecovery(false);
    // Secrets/challenges are kept only in this mounted form: never URL, storage or query cache.
    form.reset({ email: form.getValues("email"), password: "", passwordConfirm: "" });
  }

  function fieldMessage(message?: string) {
    if (message === "auth.emailInvalid") return t("auth.emailInvalid");
    if (message === "auth.passwordRequired") return t("auth.passwordRequired");
    if (message === "auth.passwordMismatch") return t("auth.passwordMismatch");
    return errorMessage(message);
  }

  async function submit(values: FormValues) {
    setSubmitError(null);
    if (mode === "register") {
      const issue = newPasswordError(values.password);
      if (issue) { form.setError("password", { message: issue }); return; }
      if (values.password !== values.passwordConfirm) { form.setError("passwordConfirm", { message: "auth.passwordMismatch" }); return; }
    }
    try {
      const result = mode === "login" ? await auth.login(values.email, values.password) :
        await auth.register(values.email, values.password, values.passwordConfirm ?? "");
      await handleResult(result, mode === "register" ? "/welcome" : "/catalog");
    } catch (error) { setSubmitError(error); }
  }

  async function startEnrollment() {
    if (!challenge) return;
    setBusy(true); setMfaError("");
    try { setEnrollment(await auth.startMfaEnrollment(challenge.challengeToken)); }
    catch (error) { setMfaError(error); }
    finally { setBusy(false); }
  }

  async function submitMfa(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    setBusy(true); setMfaError("");
    try {
      const result = challenge.status === "MFA_ENROLLMENT_REQUIRED"
        ? await auth.confirmMfaEnrollment(challenge.challengeToken, code.trim())
        : await auth.verifyMfa(challenge.challengeToken, useRecovery ? undefined : code.trim(), useRecovery ? code.trim() : undefined);
      await handleResult(result);
    } catch (error) { setMfaError(error); }
    finally { setBusy(false); }
  }

  async function finishEnrollment() {
    if (!pendingTokens || !savedCodes) return;
    setBusy(true); setMfaError("");
    try { await auth.acceptAuthenticatedResult(pendingTokens); router.push("/catalog"); }
    catch (error) { setMfaError(error); }
    finally { setBusy(false); }
  }

  function restart() {
    auth.cancelAuthentication(); setChallenge(null); setEnrollment(null); setPendingTokens(null);
    setCode(""); setMfaError(""); setSavedCodes(false); setUseRecovery(false);
  }

  return <main className="page">
    <section className="brutal stack" style={{ maxWidth: 520, margin: "40px auto", padding: "40px 32px", gap: 16 }}>
      {pendingTokens ? <>
        <h1 className="title">{t("auth.saveCodesTitle")}</h1>
        <p>{t("auth.saveCodesBody")}</p>
        <p className="muted">{t("auth.saveCodesOnce")}</p>
        <pre aria-label={t("auth.recoveryCodes")} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{pendingTokens.recoveryCodes?.join("\n")}</pre>
        <label className="label" style={{ display: "flex", gap: 12 }}>
          <input type="checkbox" checked={savedCodes} onChange={(event) => setSavedCodes(event.target.checked)} />
          {t("auth.savedCodes")}
        </label>
        <button className="button buttonDark" disabled={!savedCodes || busy} onClick={finishEnrollment}>{t("auth.continueStore")}</button>
        <button className="button" disabled={!savedCodes || busy} onClick={restart}>{t("auth.returnSignin")}</button>
      </> : challenge ? <>
        <h1 className="title">{challenge.status === "MFA_ENROLLMENT_REQUIRED" ? t("auth.setupTitle") : t("auth.verifySignin")}</h1>
        <p className="muted">{t("auth.challengeInfo", { time: formatDate(challenge.expiresAt, { timeStyle: "medium" }) })}</p>
        {challenge.status === "MFA_ENROLLMENT_REQUIRED" && !enrollment ? <>
          <p>{t("auth.setupBody")}</p>
          <button className="button buttonDark" disabled={busy} onClick={startEnrollment}>{t("auth.showKey")}</button>
        </> : <>
          {enrollment ? <div className="card stack">
            <p className="muted">{t("auth.manualSetup")}</p>
            <code aria-label={t("auth.setupKey")} style={{ overflowWrap: "anywhere", userSelect: "all" }}>{enrollment.secret}</code>
            <p className="muted">{t("auth.keyPrivate")}</p>
          </div> : null}
          <form className="stack" onSubmit={submitMfa}>
            <label className="label">{useRecovery ? t("auth.recoveryCode") : t("auth.authenticatorCode")}
              <input className="input" required value={code} autoComplete="off" inputMode={useRecovery ? "text" : "numeric"}
                pattern={useRecovery ? undefined : "[0-9]{6}"} maxLength={useRecovery ? 128 : 6}
                onChange={(event) => setCode(event.target.value)} />
            </label>
            <button className="button buttonDark" disabled={busy}>{busy ? t("auth.verifying") : useRecovery ? t("auth.replaceFactor") : t("auth.verifyCode")}</button>
          </form>
          {challenge.status === "MFA_REQUIRED" ? <button className="button" disabled={busy} onClick={() => { setUseRecovery(!useRecovery); setCode(""); setMfaError(""); }}>
            {useRecovery ? t("auth.useAuthenticator") : t("auth.useRecovery")}
          </button> : null}
        </>}
        <button className="button" disabled={busy} onClick={restart}>{t("auth.restartSignin")}</button>
      </> : <>
        <div className="stack" style={{ gap: 8 }}>
          <span className="kicker">{mode === "login" ? t("auth.welcomeBack") : t("auth.newAccount")}</span>
          <h1 className="title">{mode === "login" ? t("auth.signinTitle") : t("auth.createTitle")}</h1>
        </div>
        <form className="stack" onSubmit={form.handleSubmit(submit)}>
          <label className="label">{t("auth.email")}
            <input className="input" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? <span className="errorText">{fieldMessage(form.formState.errors.email.message)}</span> : null}
          </label>
          <label className="label">{t("auth.password")}
            <input className="input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} {...form.register("password")} />
            {form.formState.errors.password ? <span className="errorText">{fieldMessage(form.formState.errors.password.message)}</span> : null}
          </label>
          {mode === "register" ? <>
            <p className="muted">{t("auth.passwordHint")}</p>
            <label className="label">{t("auth.confirmPassword")}
              <input className="input" type="password" autoComplete="new-password" {...form.register("passwordConfirm")} />
              {form.formState.errors.passwordConfirm ? <span className="errorText">{fieldMessage(form.formState.errors.passwordConfirm.message)}</span> : null}
            </label>
          </> : null}
          {submitError ? <p role="alert" className="errorText" style={{ margin: 0 }}>{errorMessage(submitError)}</p> : null}
          <button className="button buttonDark" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? t("auth.oneMoment") : mode === "login" ? t("auth.signin") : t("auth.createAccount")}</button>
        </form>
        <GoogleSignInButton onCredential={async (idToken) => {
          setSubmitError(null);
          try { await handleResult(await auth.loginWithGoogle(idToken)); }
          catch (error) { setSubmitError(error); }
        }} />
        <div className="toolbar" style={{ justifyContent: "space-between", fontSize: "0.9rem" }}>
          {mode === "login" ? <>
            <Link className="muted" style={{ textDecoration: "underline" }} href="/forgot-password">{t("auth.forgotLink")}</Link>
            <Link className="muted" style={{ textDecoration: "underline" }} href="/register">{t("auth.newHere")}</Link>
          </> : <Link className="muted" style={{ textDecoration: "underline" }} href="/login">{t("auth.alreadyAccount")}</Link>}
        </div>
      </>}
      {mfaError ? <p role="alert" className="errorText">{errorMessage(mfaError)}</p> : null}
    </section>
  </main>;
}
