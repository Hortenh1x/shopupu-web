"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useState } from "react";
import { authApi, userApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";
import { newPasswordError } from "@/lib/auth/passwordPolicy";

export function SecurityPanel() {
  const { t, errorMessage } = useI18n();
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const changePassword = useSessionMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword)
  });
  const exportData = useSessionMutation({
    mutationFn: async (_: void, context) => {
      const data = await userApi.exportData();
      context.assertCurrent();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "shopupu-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    }
  });
  const deleteAccount = useSessionMutation({
    mutationFn: () => userApi.deleteAccount(),
    onSuccess: () => auth.logout()
  });

  return (
    <div className="split">
      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          const issue = newPasswordError(newPassword);
          setPolicyError(issue);
          if (!issue) changePassword.mutate();
        }}
      >
        <h2 className="subtitle" style={{ margin: 0 }}>
          {t("profile.changePassword")}
        </h2>
        <label className="label">
          {t("profile.currentPassword")}
          <input
            className="input"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="label">
          {t("profile.newPasswordMin")}
          <input
            className="input"
            type="password"
            required
            minLength={15}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <p className="muted">{t("profile.passwordBytes")}</p>
        {policyError ? <p role="alert" className="errorText">{errorMessage(policyError)}</p> : null}
        {changePassword.error ? <p className="errorText">{errorMessage(changePassword.error)}</p> : null}
        {changePassword.isSuccess ? (
          <div className="stack">
            <p className="status statusOk">{t("profile.passwordChanged")}</p>
            <button type="button" className="button buttonDark" onClick={auth.logout}>
              {t("profile.loginAgain")}
            </button>
          </div>
        ) : (
          <button className="button buttonDark" disabled={changePassword.isPending}>
            {t("profile.changePassword")}
          </button>
        )}
      </form>

      <div className="card stack">
        <h2 className="subtitle" style={{ margin: 0 }}>
          {t("profile.myData")}
        </h2>
        <p className="muted">{t("profile.exportScope")}</p>
        <button className="button" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
          {t("profile.download")}
        </button>
        {exportData.error ? <p className="errorText">{errorMessage(exportData.error)}</p> : null}

        <hr style={{ width: "100%", border: "none", borderTop: "1px solid var(--line)" }} />

        <h2 className="subtitle" style={{ margin: 0 }}>
          {t("profile.deleteAccount")}
        </h2>
        <p className="muted">
          {t("profile.eraseScope")}
        </p>
        {!confirmDelete ? (
          <button className="button buttonRed" onClick={() => setConfirmDelete(true)}>
            {t("profile.deleteMine")}
          </button>
        ) : (
          <div className="toolbar">
            <button className="button buttonRed" disabled={deleteAccount.isPending} onClick={() => deleteAccount.mutate()}>
              {t("profile.deleteConfirm")}
            </button>
            <button className="button" onClick={() => setConfirmDelete(false)}>
              {t("profile.keepAccount")}
            </button>
          </div>
        )}
        {deleteAccount.error ? <p className="errorText">{errorMessage(deleteAccount.error)}</p> : null}
      </div>
    </div>
  );
}
