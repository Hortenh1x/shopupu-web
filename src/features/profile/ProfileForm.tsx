"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { authApi, userApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

const SIZES = ["", "XS", "S", "M", "L", "XL", "XXL"];

export function ProfileForm() {
  const auth = useAuth();
  const [firstName, setFirstName] = useState(auth.user?.firstName ?? "");
  const [lastName, setLastName] = useState(auth.user?.lastName ?? "");
  const [phone, setPhone] = useState(auth.user?.phone ?? "");
  const [preferredSize, setPreferredSize] = useState(auth.user?.preferredSize ?? "");

  const save = useMutation({
    mutationFn: () =>
      userApi.updateProfile({
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        preferredSize: preferredSize || null
      }),
    onSuccess: () => auth.reloadUser()
  });
  const resend = useMutation({ mutationFn: () => authApi.resendVerification() });

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
          Personal data
        </h2>
        <label className="label">
          First name
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={128} />
        </label>
        <label className="label">
          Last name
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={128} />
        </label>
        <label className="label">
          Phone
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="+380..." />
        </label>
        <label className="label">
          Preferred size
          <select className="select" value={preferredSize} onChange={(e) => setPreferredSize(e.target.value)}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size || "not set"}
              </option>
            ))}
          </select>
        </label>
        {save.error ? <p className="errorText">{(save.error as Error).message}</p> : null}
        {save.isSuccess ? <p className="status statusOk">saved</p> : null}
        <button className="button buttonDark" disabled={save.isPending}>
          Save profile
        </button>
      </form>

      <aside className="card stack">
        <h2 className="subtitle" style={{ margin: 0 }}>
          Account
        </h2>
        <p>
          Email: {auth.user?.email}{" "}
          {auth.user?.emailVerified ? (
            <span className="status statusOk">verified</span>
          ) : (
            <span className="muted">not verified</span>
          )}
        </p>
        <p className="muted">Roles: {auth.user?.roles?.join(", ") || "CUSTOMER"}</p>
        {!auth.user?.emailVerified ? (
          <>
            <button className="button" disabled={resend.isPending} onClick={() => resend.mutate()}>
              Resend verification email
            </button>
            {resend.isSuccess ? <p className="status statusOk">sent - check your inbox</p> : null}
          </>
        ) : null}
      </aside>
    </div>
  );
}
