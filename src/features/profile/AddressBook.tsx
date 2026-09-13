"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { userApi } from "@/lib/api/shop";
import type { AddressInput, UserAddress } from "@/lib/api/types";

const emptyAddress: AddressInput = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: ""
};

export function AddressBook() {
  const { t, errorMessage } = useI18n();
  const queryClient = useQueryClient();
  const addresses = useSessionQuery({ queryKey: ["addresses"], queryFn: userApi.addresses });
  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["addresses"] });

  const save = useSessionMutation({
    mutationFn: () => (editingId ? userApi.updateAddress(editingId, form) : userApi.addAddress(form)),
    onSuccess: () => {
      setForm(emptyAddress);
      setEditingId(null);
      invalidate();
    }
  });
  const remove = useSessionMutation({ mutationFn: (id: number) => userApi.deleteAddress(id), onSuccess: invalidate });
  const setDefault = useSessionMutation({ mutationFn: (id: number) => userApi.setDefaultAddress(id), onSuccess: invalidate });

  function startEdit(address: UserAddress) {
    setEditingId(address.id);
    setForm({
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state ?? "",
      postalCode: address.postalCode,
      country: address.country
    });
  }

  function field<K extends keyof AddressInput>(name: K, label: string, required = true) {
    return (
      <label className="label">
        {label}
        <input
          className="input"
          required={required}
          value={(form[name] as string) ?? ""}
          onChange={(e) => setForm((current) => ({ ...current, [name]: e.target.value }))}
        />
      </label>
    );
  }

  return (
    <div className="split">
      <div className="stack">
        <h2 className="subtitle" style={{ margin: 0 }}>
          {t("profile.savedAddresses")}
        </h2>
        {addresses.error ? <p className="errorText">{errorMessage(addresses.error)}</p> : null}
        {remove.error ? <p className="errorText">{errorMessage(remove.error)}</p> : null}
        {!addresses.data?.length ? <p className="muted">{t("profile.noAddresses")}</p> : null}
        {addresses.data?.map((address) => (
          <article key={address.id} className="card stack">
            <strong>
              {address.fullName} {address.defaultAddress ? <span className="status">{t("profile.default")}</span> : null}
            </strong>
            <p className="muted">
              {[address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
                .filter(Boolean)
                .join(", ")}
            </p>
            <div className="toolbar">
              <button className="button" onClick={() => startEdit(address)}>
                {t("common.edit")}
              </button>
              {!address.defaultAddress ? (
                <button className="button" disabled={setDefault.isPending} onClick={() => setDefault.mutate(address.id)}>
                  {t("profile.makeDefault")}
                </button>
              ) : null}
              <ConfirmButton
                label={t("common.delete")}
                confirmLabel={t("common.confirmDelete")}
                disabled={remove.isPending}
                onConfirm={() => remove.mutate(address.id)}
              />
            </div>
          </article>
        ))}
      </div>

      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <h2 className="subtitle" style={{ margin: 0 }}>
          {editingId ? t("profile.editAddress") : t("profile.addAddress")}
        </h2>
        {field("fullName", t("commerce.fullName"))}
        {field("line1", t("commerce.line1"))}
        {field("line2", t("commerce.line2"), false)}
        {field("city", t("commerce.city"))}
        {field("state", t("commerce.region"))}
        {field("postalCode", t("commerce.postalCode"))}
        {field("country", t("commerce.country"))}
        {save.error ? <p className="errorText">{errorMessage(save.error)}</p> : null}
        <div className="toolbar">
          <button className="button buttonDark" disabled={save.isPending}>
            {editingId ? t("profile.saveChanges") : t("profile.addAddress")}
          </button>
          {editingId ? (
            <button
              type="button"
              className="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyAddress);
              }}
            >
              {t("common.cancel")}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
