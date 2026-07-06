"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { authApi, userApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

export function SecurityPanel() {
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword)
  });
  const exportData = useMutation({
    mutationFn: async () => {
      const data = await userApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "shopupu-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    }
  });
  const deleteAccount = useMutation({
    mutationFn: () => userApi.deleteAccount(),
    onSuccess: () => auth.logout()
  });

  return (
    <div className="split">
      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          changePassword.mutate();
        }}
      >
        <h2 className="subhead" style={{ margin: 0 }}>
          Change password
        </h2>
        <label className="label">
          Current password
          <input
            className="input"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="label">
          New password (min 8 characters)
          <input
            className="input"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        {changePassword.error ? <p className="muted">{(changePassword.error as Error).message}</p> : null}
        {changePassword.isSuccess ? (
          <div className="stack">
            <p className="status">Password changed. All sessions were logged out.</p>
            <button type="button" className="button buttonDark" onClick={auth.logout}>
              Login again
            </button>
          </div>
        ) : (
          <button className="button buttonDark" disabled={changePassword.isPending}>
            Change password
          </button>
        )}
      </form>

      <div className="card stack">
        <h2 className="subhead" style={{ margin: 0 }}>
          My data (GDPR)
        </h2>
        <p className="muted">Download everything we store about you as JSON.</p>
        <button className="button" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
          Download my data
        </button>
        {exportData.error ? <p className="muted">{(exportData.error as Error).message}</p> : null}

        <hr style={{ width: "100%", border: "none", borderTop: "1px solid var(--color-border-soft)" }} />

        <h2 className="subhead" style={{ margin: 0 }}>
          Delete account
        </h2>
        <p className="muted">
          The account is anonymized permanently: personal data, addresses, wishlist and reviews are erased. Order
          history is kept anonymized for accounting.
        </p>
        {!confirmDelete ? (
          <button className="button buttonRed" onClick={() => setConfirmDelete(true)}>
            Delete my account
          </button>
        ) : (
          <div className="toolbar">
            <button className="button buttonRed" disabled={deleteAccount.isPending} onClick={() => deleteAccount.mutate()}>
              Yes, delete permanently
            </button>
            <button className="button" onClick={() => setConfirmDelete(false)}>
              Keep my account
            </button>
          </div>
        )}
        {deleteAccount.error ? <p className="muted">{(deleteAccount.error as Error).message}</p> : null}
      </div>
    </div>
  );
}
