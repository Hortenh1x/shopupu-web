"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authApi, userApi, storefrontApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserGender } from "@/lib/api/types";

const SIZES = ["", "XS", "S", "M", "L", "XL", "XXL"];

export function ProfileForm() {
  const { t, errorMessage, roleLabel } = useI18n();
  const GENDERS: { value: UserGender | ""; label: string }[] = [
    { value: "", label: t("profile.notSet") },
    { value: "MALE", label: t("profile.male") },
    { value: "FEMALE", label: t("profile.female") },
    { value: "OTHER", label: t("profile.other") }
  ];
  const auth = useAuth();
  const config = useQuery({ queryKey: ["storefront-config"], queryFn: storefrontApi.config });
  const emailUnavailable = config.data?.email.available === false;
  const [firstName, setFirstName] = useState(auth.user?.firstName ?? "");
  const [lastName, setLastName] = useState(auth.user?.lastName ?? "");
  const [phone, setPhone] = useState(auth.user?.phone ?? "");
  const [preferredSize, setPreferredSize] = useState(auth.user?.preferredSize ?? "");
  const [gender, setGender] = useState<UserGender | "">(auth.user?.gender ?? "");

  const save = useSessionMutation({
    mutationFn: () =>
      userApi.updateProfile({
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        preferredSize: preferredSize || null,
        gender: gender || null
      }),
    onSuccess: () => auth.reloadUser()
  });
  const resend = useSessionMutation({ mutationFn: () => authApi.resendVerification() });

  return (
    <div className="split">
      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <h2 className="subtitle" style={{ margin: 0 }}>
          {t("profile.personalData")}
        </h2>
        <label className="label">
          {t("profile.firstName")}
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={128} />
        </label>
        <label className="label">
          {t("profile.lastName")}
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={128} />
        </label>
        <label className="label">
          {t("profile.phone")}
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder={t("profile.phoneExample")} />
        </label>
        <label className="label">
          {t("profile.preferredSize")}
          <select className="select" value={preferredSize} onChange={(e) => setPreferredSize(e.target.value)}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size || t("profile.notSet")}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          {t("profile.gender")}
          <select className="select" value={gender} onChange={(e) => setGender(e.target.value as UserGender | "")}>
            {GENDERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {save.error ? <p className="errorText">{errorMessage(save.error)}</p> : null}
        {save.isSuccess ? <p className="status statusOk">{t("profile.saved")}</p> : null}
        <button className="button buttonDark" disabled={save.isPending}>
          {t("profile.save")}
        </button>
      </form>

      <aside className="card stack">
        <h2 className="subtitle" style={{ margin: 0 }}>
          {t("profile.account")}
        </h2>
        <p>
          {t("auth.email")}: {auth.user?.email}{" "}
          {auth.user?.emailVerified ? (
            <span className="status statusOk">{t("profile.verified")}</span>
          ) : (
            <span className="muted">{t("profile.notVerified")}</span>
          )}
        </p>
        <p className="muted">{t("profile.roles")} {auth.user?.roles?.map(roleLabel).join(", ") || roleLabel("CUSTOMER")}</p>
        {!auth.user?.emailVerified ? (
          <>
            {emailUnavailable ? <p className="muted">{t("profile.mailDisabled")}</p> : null}
            <button className="button" disabled={resend.isPending || emailUnavailable} onClick={() => resend.mutate()}>
              {t("auth.resend")}
            </button>
            {resend.isSuccess ? <p className="status statusOk">{t("profile.resendRequested")}</p> : null}
            {resend.error ? <p role="alert" className="errorText">{errorMessage(resend.error)}</p> : null}
          </>
        ) : null}
      </aside>
    </div>
  );
}
