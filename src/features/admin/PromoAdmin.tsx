"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/lib/api/shop";
import type { PromoCodeInput, PromoType } from "@/lib/api/types";

type Draft = {
  code: string;
  promoType: PromoType;
  value: string;
  minOrderAmount: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  perUserLimit: string;
};

const emptyDraft: Draft = {
  code: "",
  promoType: "PERCENT",
  value: "10",
  minOrderAmount: "",
  startsAt: "",
  endsAt: "",
  maxRedemptions: "",
  perUserLimit: "1"
};

function toInput(draft: Draft): PromoCodeInput {
  return {
    code: draft.code.trim(),
    promoType: draft.promoType,
    value: draft.value.trim() === "" ? null : draft.value.trim(),
    minOrderAmount: draft.minOrderAmount.trim() === "" ? null : draft.minOrderAmount.trim(),
    startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    maxRedemptions: draft.maxRedemptions.trim() === "" ? null : Number(draft.maxRedemptions),
    perUserLimit: draft.perUserLimit.trim() === "" ? null : Number(draft.perUserLimit),
    enabled: true
  };
}

export function PromoAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const promos = useQuery({ queryKey: ["admin-promos", page], queryFn: () => adminApi.promos(page) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
  const create = useMutation({
    mutationFn: () => adminApi.createPromo(toInput(draft)),
    onSuccess: () => {
      setDraft(emptyDraft);
      invalidate();
    }
  });
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => adminApi.setPromoEnabled(id, enabled),
    onSuccess: invalidate
  });

  const data = promos.data;

  return (
    <div className="stack">
      <form
        className="card toolbar"
        style={{ flexWrap: "wrap", alignItems: "flex-end" }}
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <label className="label">
          Code
          <input
            className="input"
            required
            placeholder="SALE10"
            value={draft.code}
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
            style={{ width: 130 }}
          />
        </label>
        <label className="label">
          Type
          <select
            className="select"
            value={draft.promoType}
            onChange={(e) => setDraft((d) => ({ ...d, promoType: e.target.value as PromoType }))}
          >
            <option value="PERCENT">Percent %</option>
            <option value="FIXED">Fixed amount</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </select>
        </label>
        <label className="label">
          Value
          <input
            className="input"
            inputMode="decimal"
            disabled={draft.promoType === "FREE_SHIPPING"}
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            style={{ width: 80 }}
          />
        </label>
        <label className="label">
          Min order
          <input
            className="input"
            inputMode="decimal"
            value={draft.minOrderAmount}
            onChange={(e) => setDraft((d) => ({ ...d, minOrderAmount: e.target.value }))}
            style={{ width: 90 }}
          />
        </label>
        <label className="label">
          Starts
          <input
            className="input"
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))}
          />
        </label>
        <label className="label">
          Ends
          <input
            className="input"
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))}
          />
        </label>
        <label className="label">
          Max uses
          <input
            className="input"
            type="number"
            min={1}
            placeholder="∞"
            value={draft.maxRedemptions}
            onChange={(e) => setDraft((d) => ({ ...d, maxRedemptions: e.target.value }))}
            style={{ width: 80 }}
          />
        </label>
        <label className="label">
          Per user
          <input
            className="input"
            type="number"
            min={1}
            value={draft.perUserLimit}
            onChange={(e) => setDraft((d) => ({ ...d, perUserLimit: e.target.value }))}
            style={{ width: 80 }}
          />
        </label>
        <button className="button buttonDark" disabled={create.isPending}>
          Create promo
        </button>
      </form>
      {create.error ? <p className="muted">{(create.error as Error).message}</p> : null}
      {promos.error ? <p className="muted">{(promos.error as Error).message}</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Min order</th>
            <th>Window</th>
            <th>Uses</th>
            <th>Per user</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.content?.map((promo) => (
            <tr key={promo.id}>
              <td>
                <strong>{promo.code}</strong>
              </td>
              <td>{promo.promoType}</td>
              <td>{promo.promoType === "FREE_SHIPPING" ? "-" : Number(promo.value).toFixed(2)}</td>
              <td>{promo.minOrderAmount != null ? Number(promo.minOrderAmount).toFixed(2) : "-"}</td>
              <td className="muted">
                {promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : "..."} -{" "}
                {promo.endsAt ? new Date(promo.endsAt).toLocaleDateString() : "..."}
              </td>
              <td>
                {promo.redemptionCount}
                {promo.maxRedemptions != null ? ` / ${promo.maxRedemptions}` : ""}
              </td>
              <td>{promo.perUserLimit}</td>
              <td>{promo.enabled ? "enabled" : "disabled"}</td>
              <td>
                <button
                  className={promo.enabled ? "button buttonRed" : "button buttonGreen"}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: promo.id, enabled: !promo.enabled })}
                >
                  {promo.enabled ? "Disable" : "Enable"}
                </button>
              </td>
            </tr>
          ))}
          {!data?.content?.length ? (
            <tr>
              <td colSpan={9} className="muted">
                No promo codes yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="status">
            {page + 1} / {data.totalPages}
          </span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
