"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/lib/api/shop";
import type { Variant, VariantInput } from "@/lib/api/types";

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
  const queryClient = useQueryClient();
  const variants = useQuery({ queryKey: ["admin-variants", productId], queryFn: () => adminApi.variants(productId) });
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-variants", productId] });

  const save = useMutation({
    mutationFn: () =>
      editingId ? adminApi.updateVariant(editingId, toInput(draft)) : adminApi.addVariant(productId, toInput(draft)),
    onSuccess: () => {
      setDraft(emptyDraft);
      setEditingId(null);
      invalidate();
    }
  });
  const disable = useMutation({
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
        Variants (size / color / SKU)
      </h2>
      {variants.error ? <p className="errorText">{(variants.error as Error).message}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Size</th>
            <th>Color</th>
            <th>Price</th>
            <th>Old price</th>
            <th>Available</th>
            <th>Enabled</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {variants.data?.map((variant) => (
            <tr key={variant.id}>
              <td className="muted">{variant.sku}</td>
              <td>{variant.size}</td>
              <td>{variant.color ?? "-"}</td>
              <td>{Number(variant.price).toFixed(2)}</td>
              <td>{variant.oldPrice != null ? Number(variant.oldPrice).toFixed(2) : "-"}</td>
              <td>{variant.available ?? 0}</td>
              <td>{variant.enabled ? "yes" : "no"}</td>
              <td>
                <div className="toolbar">
                  <button className="button" onClick={() => startEdit(variant)}>
                    Edit
                  </button>
                  {variant.enabled ? (
                    <button className="button buttonRed" disabled={disable.isPending} onClick={() => disable.mutate(variant.id)}>
                      Disable
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {!variants.data?.length ? (
            <tr>
              <td colSpan={8} className="muted">
                No variants yet - the product cannot be bought until a variant with stock exists.
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
          SKU
          <input
            className="input"
            required
            value={draft.sku}
            onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
            style={{ width: 140 }}
          />
        </label>
        <label className="label">
          Size
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
          Color
          <input
            className="input"
            placeholder="black"
            value={draft.color}
            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
            style={{ width: 110 }}
          />
        </label>
        <label className="label">
          Price
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
          Old price
          <input
            className="input"
            inputMode="decimal"
            value={draft.oldPrice}
            onChange={(e) => setDraft((d) => ({ ...d, oldPrice: e.target.value }))}
            style={{ width: 90 }}
          />
        </label>
        <label className="label">
          Stock
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
          Enabled
        </label>
        <button className="button buttonDark" disabled={save.isPending}>
          {editingId ? "Save variant" : "Add variant"}
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
            Cancel
          </button>
        ) : null}
      </form>
      {save.error ? <p className="errorText">{(save.error as Error).message}</p> : null}
      <p className="muted">Note: stock updates the inventory level; it cannot go below the currently reserved quantity.</p>
    </section>
  );
}
