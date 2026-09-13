"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminApi, catalogApi } from "@/lib/api/shop";
import type { ProductInput } from "@/lib/api/types";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { VariantEditor } from "@/features/admin/VariantEditor";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/messages";

// Messages are codes ("min:2", "max:255", "slug", "price", "category"); the component translates them.
const schema = z.object({
  title: z.string().min(2, "min:2").max(255, "max:255"),
  slug: z.string().regex(/^[a-z0-9-]*$/, "slug").optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "price"),
  oldPrice: z.union([z.coerce.number().min(0, "price"), z.literal("")]).optional(),
  brandName: z.string().max(255, "max:255").optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]),
  season: z.string().max(32, "max:32").optional(),
  material: z.string().max(255, "max:255").optional(),
  careInstructions: z.string().max(5000, "max:5000").optional(),
  metaTitle: z.string().max(255, "max:255").optional(),
  metaDescription: z.string().max(512, "max:512").optional(),
  enabled: z.boolean(),
  categoryId: z.coerce.number().min(1, "category")
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const FIELD_LABELS: Record<keyof FormInput, TranslationKey> = {
  title: "admin.field.title",
  slug: "admin.field.slug",
  description: "admin.field.description",
  price: "admin.field.basePrice",
  oldPrice: "admin.field.oldPrice",
  brandName: "admin.brand",
  gender: "admin.gender",
  season: "admin.field.season",
  material: "admin.field.material",
  careInstructions: "admin.field.care",
  metaTitle: "admin.field.metaTitle",
  metaDescription: "admin.field.metaDescription",
  enabled: "admin.field.enabledVisible",
  categoryId: "admin.field.category"
};

function toProductInput(values: FormValues): ProductInput {
  return {
    categoryId: values.categoryId,
    title: values.title,
    slug: values.slug || null,
    description: values.description || null,
    price: values.price,
    oldPrice: values.oldPrice === "" || values.oldPrice == null ? null : values.oldPrice,
    brandName: values.brandName || null,
    gender: values.gender,
    season: values.season || null,
    material: values.material || null,
    careInstructions: values.careInstructions || null,
    metaTitle: values.metaTitle || null,
    metaDescription: values.metaDescription || null,
    enabled: values.enabled
  };
}

export function ProductForm({ productId }: { productId?: number }) {
  const { t, errorMessage, formatNumber, genderLabel } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const product = useSessionQuery({
    queryKey: ["admin-product", productId],
    queryFn: () => adminApi.product(productId!),
    enabled: Boolean(productId)
  });

  const create = useSessionMutation({
    mutationFn: (values: FormValues) => adminApi.createProduct(toProductInput(values)),
    onSuccess: (created) => router.push(`/admin/products/${created.id}`)
  });
  const update = useSessionMutation({
    mutationFn: (values: FormValues) => adminApi.updateProduct(productId!, toProductInput(values)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-product", productId] })
  });
  const uploadImage = useSessionMutation({
    mutationFn: (file: File) => adminApi.uploadProductImage(productId!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-product", productId] })
  });
  const deleteImage = useSessionMutation({
    mutationFn: (imageId: number) => adminApi.deleteProductImage(productId!, imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-product", productId] })
  });

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      price: 0,
      oldPrice: "",
      brandName: "",
      gender: "UNISEX",
      season: "",
      material: "",
      careInstructions: "",
      metaTitle: "",
      metaDescription: "",
      enabled: true,
      categoryId: 0
    }
  });

  useEffect(() => {
    if (!product.data) return;
    form.reset({
      title: product.data.title,
      slug: product.data.slug ?? "",
      description: product.data.description ?? "",
      price: product.data.price,
      oldPrice: product.data.oldPrice ?? "",
      brandName: product.data.brandName ?? "",
      gender: product.data.gender ?? "UNISEX",
      season: product.data.season ?? "",
      material: product.data.material ?? "",
      careInstructions: product.data.careInstructions ?? "",
      metaTitle: product.data.metaTitle ?? "",
      metaDescription: product.data.metaDescription ?? "",
      enabled: product.data.enabled,
      categoryId: product.data.categoryId ?? 0
    });
  }, [form, product.data]);

  const mutationError = create.error ?? update.error;
  const firstError = Object.entries(form.formState.errors)[0] as [keyof FormInput, { message?: string }] | undefined;

  function validationMessage(name: keyof FormInput, code: string | undefined) {
    const field = t(FIELD_LABELS[name]);
    if (code === "price") return t("admin.validation.price");
    if (code === "category") return t("admin.validation.category");
    if (code === "slug") return t("admin.validation.slug");
    const [bound, count] = (code ?? "").split(":");
    if (bound === "min" && name === "title") return t("admin.validation.titleMin", { min: formatNumber(Number(count)) });
    if (bound === "max") return t("admin.validation.max", { field, max: formatNumber(Number(count)) });
    return t("admin.validation.invalid", { field });
  }

  return (
    <div className="stack">
      <form
        className="card stack"
        onSubmit={form.handleSubmit((values) => (productId ? update.mutate(values) : create.mutate(values)))}
      >
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label" style={{ flexGrow: 1 }}>
            {t("admin.field.title")}
            <input className="input" {...form.register("title")} />
          </label>
          <label className="label">
            {t("admin.field.slug")}
            <input className="input" placeholder={t("admin.field.slugPlaceholder")} {...form.register("slug")} />
          </label>
          <label className="label">
            {t("admin.field.category")}
            <select className="select" {...form.register("categoryId")}>
              <option value={0}>{t("admin.select")}</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="label">
          {t("admin.field.description")}
          <textarea className="textarea" {...form.register("description")} />
        </label>
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label">
            {t("admin.field.basePrice")}
            <input className="input" inputMode="decimal" {...form.register("price")} />
          </label>
          <label className="label">
            {t("admin.field.oldPrice")}
            <input className="input" inputMode="decimal" placeholder={t("admin.field.oldPricePlaceholder")} {...form.register("oldPrice")} />
          </label>
          <label className="label">
            {t("admin.brand")}
            <input className="input" {...form.register("brandName")} />
          </label>
          <label className="label">
            {t("admin.gender")}
            <select className="select" {...form.register("gender")}>
              {["MEN", "WOMEN", "UNISEX", "KIDS"].map((gender) => (
                <option key={gender} value={gender}>
                  {genderLabel(gender)}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            {t("admin.field.season")}
            <input className="input" placeholder="SS26" {...form.register("season")} />
          </label>
          <label className="label">
            {t("admin.field.material")}
            <input className="input" placeholder={t("admin.field.materialPlaceholder")} {...form.register("material")} />
          </label>
        </div>
        <label className="label">
          {t("admin.field.care")}
          <textarea className="textarea" {...form.register("careInstructions")} />
        </label>
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label" style={{ flexGrow: 1 }}>
            {t("admin.field.metaTitle")}
            <input className="input" {...form.register("metaTitle")} />
          </label>
          <label className="label" style={{ flexGrow: 2 }}>
            {t("admin.field.metaDescription")}
            <input className="input" {...form.register("metaDescription")} />
          </label>
        </div>
        <label className="label" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
          <input type="checkbox" {...form.register("enabled")} />
          {t("admin.field.enabledVisible")}
        </label>
        {firstError ? (
          <p className="muted">{validationMessage(firstError[0], firstError[1]?.message)}</p>
        ) : null}
        {mutationError ? <p className="muted">{errorMessage(mutationError)}</p> : null}
        {update.isSuccess ? <p className="status statusOk">{t("admin.saved")}</p> : null}
        <button className="button buttonDark" disabled={create.isPending || update.isPending}>
          {productId ? t("admin.saveProduct") : t("admin.createProduct")}
        </button>
        {!productId ? <p className="muted">{t("admin.variantsAfterCreate")}</p> : null}
      </form>

      {productId ? (
        <>
          <section className="card stack">
            <h2 className="subtitle" style={{ margin: 0 }}>
              {t("admin.images")}
            </h2>
            <div className="toolbar" style={{ flexWrap: "wrap" }}>
              {product.data?.images?.map((image) => (
                <div key={image.id} className="stack" style={{ gap: 8 }}>
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      background: `center / cover no-repeat url(${image.url})`
                    }}
                  />
                  <ConfirmButton
                    className="button buttonRed buttonSmall"
                    label={t("common.delete")}
                    confirmLabel={t("common.confirmDelete")}
                    disabled={deleteImage.isPending}
                    onConfirm={() => deleteImage.mutate(image.id)}
                  />
                </div>
              ))}
              {!product.data?.images?.length ? <p className="muted">{t("admin.noImages")}</p> : null}
            </div>
            <label className="label">
              {t("admin.uploadImage")}
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadImage.mutate(file);
                  event.target.value = "";
                }}
              />
            </label>
            {uploadImage.error ? <p className="errorText">{errorMessage(uploadImage.error)}</p> : null}
          </section>

          <VariantEditor productId={productId} basePrice={product.data?.price ?? 0} />
        </>
      ) : null}
    </div>
  );
}
