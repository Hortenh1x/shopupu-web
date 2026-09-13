"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/lib/api/shop";
import type { PromoCodeInput, PromoType } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const PROMO_TYPES = ["PERCENT", "FIXED", "FREE_SHIPPING"] as const;

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
  const { t, errorMessage, formatPrice, formatDate } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const promos = useSessionQuery({ queryKey: ["admin-promos", page], queryFn: () => adminApi.promos(page) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-promos"] });
  const create = useSessionMutation({
    mutationFn: () => adminApi.createPromo(toInput(draft)),
    onSuccess: () => {
      setDraft(emptyDraft);
      invalidate();
    }
  });
  const toggle = useSessionMutation({
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
          {t("admin.code")}
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
          {t("admin.type")}
          <select
            className="select"
            value={draft.promoType}
            onChange={(e) => setDraft((d) => ({ ...d, promoType: e.target.value as PromoType }))}
          >
            {PROMO_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`admin.promoType.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          {t("admin.value")}
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
          {t("admin.minOrder")}
          <input
            className="input"
            inputMode="decimal"
            value={draft.minOrderAmount}
            onChange={(e) => setDraft((d) => ({ ...d, minOrderAmount: e.target.value }))}
            style={{ width: 90 }}
          />
        </label>
        <label className="label">
          {t("admin.starts")}
          <input
            className="input"
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))}
          />
        </label>
        <label className="label">
          {t("admin.ends")}
          <input
            className="input"
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))}
          />
        </label>
        <label className="label">
          {t("admin.maxUses")}
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
          {t("admin.perUser")}
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
          {t("admin.createPromo")}
        </button>
      </form>
      {create.error ? <p className="errorText">{errorMessage(create.error)}</p> : null}
      {promos.error ? <p className="errorText">{errorMessage(promos.error)}</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>{t("admin.code")}</th>
            <th>{t("admin.type")}</th>
            <th>{t("admin.value")}</th>
            <th>{t("admin.minOrder")}</th>
            <th>{t("admin.window")}</th>
            <th>{t("admin.uses")}</th>
            <th>{t("admin.perUser")}</th>
            <th>{t("admin.status")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.content?.map((promo) => (
            <tr key={promo.id}>
              <td>
                <strong>{promo.code}</strong>
              </td>
              <td>{t(`admin.promoType.${promo.promoType}`)}</td>
              <td>{promo.promoType === "FREE_SHIPPING" ? "-" : promo.promoType === "PERCENT" ? `${Number(promo.value)} %` : formatPrice(promo.value)}</td>
              <td>{promo.minOrderAmount != null ? formatPrice(promo.minOrderAmount) : "-"}</td>
              <td className="muted">
                {promo.startsAt ? formatDate(promo.startsAt, { dateStyle: "medium" }) : "..."} -{" "}
                {promo.endsAt ? formatDate(promo.endsAt, { dateStyle: "medium" }) : "..."}
              </td>
              <td>
                {promo.redemptionCount}
                {promo.maxRedemptions != null ? ` / ${promo.maxRedemptions}` : ""}
              </td>
              <td>{promo.perUserLimit}</td>
              <td>{promo.enabled ? t("common.enabled") : t("common.disabled")}</td>
              <td>
                <button
                  className={promo.enabled ? "button buttonRed" : "button buttonGreen"}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: promo.id, enabled: !promo.enabled })}
                >
                  {promo.enabled ? t("admin.disable") : t("admin.enable")}
                </button>
              </td>
            </tr>
          ))}
          {!data?.content?.length ? (
            <tr>
              <td colSpan={9} className="muted">
                {t("admin.noPromos")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {data && data.totalPages > 1 ? (
        <div className="toolbar" style={{ justifyContent: "center" }}>
          <button className="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            {t("common.previous")}
          </button>
          <span className="mono muted" style={{ fontSize: "0.88rem" }}>{t("common.page", { page: page + 1, pages: data.totalPages })}</span>
          <button className="button" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            {t("common.next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
