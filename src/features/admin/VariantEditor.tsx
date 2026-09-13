"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/lib/api/shop";
import type { Variant, VariantInput } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/LocaleProvider";

type VariantDraft = {
  sku: string;
  size: string;
  color: string;
  price: string;
  oldPrice: string;
  stock: string;
  enabled: boolean;
};

const emptyDraft: VariantDraft = { sku: "", size: "", color: "", price: "", oldPrice: "", stock: "0", enabled: true };

function toInput(draft: VariantDraft): VariantInput {
  return {
    sku: draft.sku.trim(),
    size: draft.size.trim(),
    color: draft.color.trim() || null,
    price: draft.price.trim() === "" ? null : draft.price.trim(),
    oldPrice: draft.oldPrice.trim() === "" ? null : draft.oldPrice.trim(),
    stock: draft.stock.trim() === "" ? null : Number(draft.stock),
    enabled: draft.enabled
  };
}

export function VariantEditor({ productId, basePrice }: { productId: number; basePrice: number }) {
  const { t, errorMessage, formatPrice } = useI18n();
  const queryClient = useQueryClient();
  const variants = useSessionQuery({ queryKey: ["admin-variants", productId], queryFn: () => adminApi.variants(productId) });
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-variants", productId] });

  const save = useSessionMutation({
    mutationFn: () =>
      editingId ? adminApi.updateVariant(editingId, toInput(draft)) : adminApi.addVariant(productId, toInput(draft)),
    onSuccess: () => {
      setDraft(emptyDraft);
      setEditingId(null);
      invalidate();
    }
  });
  const disable = useSessionMutation({
    mutationFn: (variantId: number) => adminApi.deleteVariant(variantId),
    onSuccess: invalidate
  });

  function startEdit(variant: Variant) {
    setEditingId(variant.id);
    setDraft({
      sku: variant.sku,
      size: variant.size,
      color: variant.color ?? "",
      price: String(variant.price ?? ""),
      oldPrice: variant.oldPrice != null ? String(variant.oldPrice) : "",
      stock: variant.available != null ? String(variant.available) : "",
      enabled: variant.enabled
    });
  }

  return (
    <section className="card stack">
      <h2 className="subtitle" style={{ margin: 0 }}>
        {t("admin.variantsTitle")}
      </h2>
      {variants.error ? <p className="errorText">{errorMessage(variants.error)}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>{t("admin.sku")}</th>
            <th>{t("admin.size")}</th>
            <th>{t("admin.color")}</th>
            <th>{t("admin.price")}</th>
            <th>{t("admin.field.oldPrice")}</th>
            <th>{t("admin.available")}</th>
            <th>{t("common.enabled")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {variants.data?.map((variant) => (
            <tr key={variant.id}>
              <td className="muted">{variant.sku}</td>
              <td>{variant.size}</td>
              <td>{variant.color ?? "-"}</td>
              <td>{formatPrice(variant.price)}</td>
              <td>{variant.oldPrice != null ? formatPrice(variant.oldPrice) : "-"}</td>
              <td>{variant.available ?? 0}</td>
              <td>{variant.enabled ? t("common.yes") : t("common.no")}</td>
              <td>
                <div className="toolbar">
                  <button className="button" onClick={() => startEdit(variant)}>
                    {t("common.edit")}
                  </button>
                  {variant.enabled ? (
                    <button className="button buttonRed" disabled={disable.isPending} onClick={() => disable.mutate(variant.id)}>
                      {t("admin.disable")}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {!variants.data?.length ? (
            <tr>
              <td colSpan={8} className="muted">
                {t("admin.noVariants")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <form
        className="toolbar"
        style={{ flexWrap: "wrap", alignItems: "flex-end" }}
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <label className="label">
          {t("admin.sku")}
          <input
            className="input"
            required
            value={draft.sku}
            onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
            style={{ width: 140 }}
          />
        </label>
        <label className="label">
          {t("admin.size")}
          <input
            className="input"
            required
            placeholder="M"
            value={draft.size}
            onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value }))}
            style={{ width: 80 }}
          />
        </label>
        <label className="label">
          {t("admin.color")}
          <input
            className="input"
            placeholder={t("admin.colorPlaceholder")}
            value={draft.color}
            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
            style={{ width: 110 }}
          />
        </label>
        <label className="label">
          {t("admin.price")}
          <input
            className="input"
            inputMode="decimal"
            placeholder={`${basePrice}`}
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            style={{ width: 90 }}
          />
        </label>
        <label className="label">
          {t("admin.field.oldPrice")}
          <input
            className="input"
            inputMode="decimal"
            value={draft.oldPrice}
            onChange={(e) => setDraft((d) => ({ ...d, oldPrice: e.target.value }))}
            style={{ width: 90 }}
          />
        </label>
        <label className="label">
          {t("admin.stock")}
          <input
            className="input"
            type="number"
            min={0}
            value={draft.stock}
            onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
            style={{ width: 80 }}
          />
        </label>
        <label className="label" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
          />
          {t("common.enabled")}
        </label>
        <button className="button buttonDark" disabled={save.isPending}>
          {editingId ? t("admin.saveVariant") : t("admin.addVariant")}
        </button>
        {editingId ? (
          <button
            type="button"
            className="button"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft);
            }}
          >
            {t("common.cancel")}
          </button>
        ) : null}
      </form>
      {save.error ? <p className="errorText">{errorMessage(save.error)}</p> : null}
      <p className="muted">{t("admin.stockNote")}</p>
    </section>
  );
}
