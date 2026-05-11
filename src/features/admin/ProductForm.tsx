"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminApi, catalogApi } from "@/lib/api/shop";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  sku: z.string().min(2),
  stock: z.coerce.number().int().min(0),
  enabled: z.boolean(),
  categoryId: z.coerce.number().min(1)
});

type ProductFormInput = z.input<typeof schema>;
type ProductFormValues = z.output<typeof schema>;

export function ProductForm({ productId }: { productId?: number }) {
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogApi.categories });
  const product = useQuery({
    queryKey: ["admin-product", productId],
    queryFn: () => adminApi.product(productId!),
    enabled: Boolean(productId)
  });
  const create = useMutation({ mutationFn: (values: ProductFormValues) => adminApi.createProduct(values) });
  const update = useMutation({ mutationFn: (values: ProductFormValues) => adminApi.updateProduct(productId!, values) });
  const upload = useMutation({
    mutationFn: ({ file, id }: { file: File; id: number }) => adminApi.uploadProductImage(id, file)
  });
  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", price: 0, sku: "", stock: 0, enabled: true, categoryId: 0 }
  });

  useEffect(() => {
    if (!product.data) return;
    form.reset({
      title: product.data.title,
      description: product.data.description ?? "",
      price: product.data.price,
      sku: product.data.sku,
      stock: product.data.stock,
      enabled: product.data.enabled,
      categoryId: product.data.categoryId ?? 0
    });
  }, [form, product.data]);

  async function submit(values: ProductFormValues) {
    const result = productId ? await update.mutateAsync(values) : await create.mutateAsync(values);
    const file = (document.getElementById("productImage") as HTMLInputElement | null)?.files?.[0];
    if (file) await upload.mutateAsync({ id: result.id, file });
  }

  return (
    <form className="card stack" onSubmit={form.handleSubmit(submit)}>
      <label className="label">Title<input className="input" {...form.register("title")} /></label>
      <label className="label">SKU<input className="input" {...form.register("sku")} /></label>
      <label className="label">Description<textarea className="textarea" {...form.register("description")} /></label>
      <div className="toolbar">
        <label className="label">Price<input className="input" {...form.register("price")} /></label>
        <label className="label">Stock<input className="input" {...form.register("stock")} /></label>
        <label className="label">
          Category
          <select className="select" {...form.register("categoryId")}>
            <option value={0}>Select</option>
            {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>
      <label className="label">
        Image
        <input id="productImage" className="input" type="file" accept="image/*" />
      </label>
      <label className="label" style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <input type="checkbox" {...form.register("enabled")} />
        Enabled
      </label>
      <button className="button buttonDark" disabled={create.isPending || update.isPending || upload.isPending}>Save product</button>
      {create.data || update.data ? <span className="status">Saved</span> : null}
      {create.error || update.error || upload.error ? <p className="muted">{(create.error ?? update.error ?? upload.error)?.message}</p> : null}
    </form>
  );
}
