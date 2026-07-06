"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminApi, catalogApi } from "@/lib/api/shop";
import type { ProductInput } from "@/lib/api/types";
import { VariantEditor } from "@/features/admin/VariantEditor";

const schema = z.object({
  title: z.string().min(2).max(255),
  slug: z.string().regex(/^[a-z0-9-]*$/, "lowercase letters, digits and dashes").optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  oldPrice: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  brandName: z.string().max(255).optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]),
  season: z.string().max(32).optional(),
  material: z.string().max(255).optional(),
  careInstructions: z.string().max(5000).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(512).optional(),
  enabled: z.boolean(),
  categoryId: z.coerce.number().min(1, "select a category")
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const product = useQuery({
    queryKey: ["admin-product", productId],
    queryFn: () => adminApi.product(productId!),
    enabled: Boolean(productId)
  });

  const create = useMutation({
    mutationFn: (values: FormValues) => adminApi.createProduct(toProductInput(values)),
    onSuccess: (created) => router.push(`/admin/products/${created.id}`)
  });
  const update = useMutation({
    mutationFn: (values: FormValues) => adminApi.updateProduct(productId!, toProductInput(values)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-product", productId] })
  });
  const uploadImage = useMutation({
    mutationFn: (file: File) => adminApi.uploadProductImage(productId!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-product", productId] })
  });
  const deleteImage = useMutation({
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

  return (
    <div className="stack">
      <form
        className="card stack"
        onSubmit={form.handleSubmit((values) => (productId ? update.mutate(values) : create.mutate(values)))}
      >
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label" style={{ flexGrow: 1 }}>
            Title
            <input className="input" {...form.register("title")} />
          </label>
          <label className="label">
            Slug (optional)
            <input className="input" placeholder="auto-generated" {...form.register("slug")} />
          </label>
          <label className="label">
            Category
            <select className="select" {...form.register("categoryId")}>
              <option value={0}>Select</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="label">
          Description
          <textarea className="textarea" {...form.register("description")} />
        </label>
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label">
            Base price
            <input className="input" inputMode="decimal" {...form.register("price")} />
          </label>
          <label className="label">
            Old price
            <input className="input" inputMode="decimal" placeholder="for sale badge" {...form.register("oldPrice")} />
          </label>
          <label className="label">
            Brand
            <input className="input" {...form.register("brandName")} />
          </label>
          <label className="label">
            Gender
            <select className="select" {...form.register("gender")}>
              {["MEN", "WOMEN", "UNISEX", "KIDS"].map((gender) => (
                <option key={gender} value={gender}>
                  {gender.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Season
            <input className="input" placeholder="SS26" {...form.register("season")} />
          </label>
          <label className="label">
            Material
            <input className="input" placeholder="100% cotton" {...form.register("material")} />
          </label>
        </div>
        <label className="label">
          Care instructions
          <textarea className="textarea" {...form.register("careInstructions")} />
        </label>
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          <label className="label" style={{ flexGrow: 1 }}>
            Meta title
            <input className="input" {...form.register("metaTitle")} />
          </label>
          <label className="label" style={{ flexGrow: 2 }}>
            Meta description
            <input className="input" {...form.register("metaDescription")} />
          </label>
        </div>
        <label className="label" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input type="checkbox" {...form.register("enabled")} />
          Enabled (visible in the shop)
        </label>
        {Object.values(form.formState.errors).length ? (
          <p className="muted">{Object.values(form.formState.errors)[0]?.message as string}</p>
        ) : null}
        {mutationError ? <p className="muted">{(mutationError as Error).message}</p> : null}
        {update.isSuccess ? <p className="status">Saved</p> : null}
        <button className="button buttonDark" disabled={create.isPending || update.isPending}>
          {productId ? "Save product" : "Create product"}
        </button>
        {!productId ? <p className="muted">Variants and images are added after the product is created.</p> : null}
      </form>

      {productId ? (
        <>
          <section className="card stack">
            <h2 className="subhead" style={{ margin: 0 }}>
              Images
            </h2>
            <div className="toolbar" style={{ flexWrap: "wrap" }}>
              {product.data?.images?.map((image) => (
                <div key={image.id} className="stack" style={{ gap: 6 }}>
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      border: "1px solid var(--color-border-soft)",
                      borderRadius: 12,
                      background: `center / cover no-repeat url(${image.url})`
                    }}
                  />
                  <button
                    className="button buttonRed"
                    disabled={deleteImage.isPending}
                    onClick={() => deleteImage.mutate(image.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {!product.data?.images?.length ? <p className="muted">No images yet.</p> : null}
            </div>
            <label className="label">
              Upload image (jpeg/png/webp/gif)
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
            {uploadImage.error ? <p className="muted">{(uploadImage.error as Error).message}</p> : null}
          </section>

          <VariantEditor productId={productId} basePrice={product.data?.price ?? 0} />
        </>
      ) : null}
    </div>
  );
}
