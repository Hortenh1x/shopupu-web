"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: userApi.addresses });
  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["addresses"] });

  const save = useMutation({
    mutationFn: () => (editingId ? userApi.updateAddress(editingId, form) : userApi.addAddress(form)),
    onSuccess: () => {
      setForm(emptyAddress);
      setEditingId(null);
      invalidate();
    }
  });
  const remove = useMutation({ mutationFn: (id: number) => userApi.deleteAddress(id), onSuccess: invalidate });
  const setDefault = useMutation({ mutationFn: (id: number) => userApi.setDefaultAddress(id), onSuccess: invalidate });

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
        <h2 className="subhead" style={{ margin: 0 }}>
          Saved addresses
        </h2>
        {addresses.error ? <p className="muted">{(addresses.error as Error).message}</p> : null}
        {!addresses.data?.length ? <p className="muted">No saved addresses yet.</p> : null}
        {addresses.data?.map((address) => (
          <article key={address.id} className="card stack">
            <strong>
              {address.fullName} {address.defaultAddress ? <span className="status">default</span> : null}
            </strong>
            <p className="muted">
              {[address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
                .filter(Boolean)
                .join(", ")}
            </p>
            <div className="toolbar">
              <button className="button" onClick={() => startEdit(address)}>
                Edit
              </button>
              {!address.defaultAddress ? (
                <button className="button" disabled={setDefault.isPending} onClick={() => setDefault.mutate(address.id)}>
                  Make default
                </button>
              ) : null}
              <button className="button buttonRed" disabled={remove.isPending} onClick={() => remove.mutate(address.id)}>
                Delete
              </button>
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
        <h2 className="subhead" style={{ margin: 0 }}>
          {editingId ? "Edit address" : "Add address"}
        </h2>
        {field("fullName", "Full name")}
        {field("line1", "Address line 1")}
        {field("line2", "Address line 2", false)}
        {field("city", "City")}
        {field("state", "State / region")}
        {field("postalCode", "Postal code")}
        {field("country", "Country")}
        {save.error ? <p className="muted">{(save.error as Error).message}</p> : null}
        <div className="toolbar">
          <button className="button buttonDark" disabled={save.isPending}>
            {editingId ? "Save changes" : "Add address"}
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
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
