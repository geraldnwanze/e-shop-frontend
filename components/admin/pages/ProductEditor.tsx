"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import { emptyProductForm, formToPayload, MAX_OPTIONS, productToForm, serverKeyToProductField, validateProductForm, variantValuesError, type ProductForm } from "@/lib/admin/product-form";
import { stockAdjustSchema, flatten } from "@/lib/admin/schemas";
import type { AdminCategory, AdminProduct, InventoryMovement, MediaItem } from "@/lib/admin/types";

import { ConfirmDialog } from "../ConfirmDialog";
import { MediaPicker } from "../MediaPicker";
import { MoneyField } from "../MoneyField";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Card, CardBody, CardHeader, EmptyState, ErrorState, Notice, PageHeader, Select, Spinner, TextArea, TextInput, Toggle, tableClasses } from "../ui";

export function ProductEditor({ productId }: { productId?: string }) {
  const product = useQuery({ queryKey: ["product", productId], queryFn: () => adminApi.get<AdminProduct>(`products/${productId}`), enabled: !!productId });

  if (productId && product.isLoading) return <Spinner />;
  if (productId && product.error) return <ErrorState message={errorMessage(product.error, "Could not load this product.")} onRetry={() => product.refetch()} />;

  // Keyed by id + update time so a refetch after save re-seeds the form.
  return <ProductFormView key={product.data ? `${product.data.id}-${product.dataUpdatedAt}` : "new"} product={product.data} />;
}

function ProductFormView({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: store } = useStore();
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => adminApi.get<AdminCategory[]>("categories") });

  const [form, setForm] = useState<ProductForm>(() => (product ? productToForm(product) : emptyProductForm()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = (changes: Partial<ProductForm>) => setForm((f) => ({ ...f, ...changes }));
  const hasVariants = form.variants.length > 0;
  const currency = store?.currency;

  const save = useMutation({
    mutationFn: (payload: ReturnType<typeof formToPayload>) => (product ? adminApi.put<AdminProduct>(`products/${product.id}`, payload) : adminApi.post<AdminProduct>("products", payload)),
    onSuccess: async (saved) => {
      toast.success(product ? "Product saved" : "Product created");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.setQueryData(["product", saved.id], saved);
      if (!product) router.replace(`/dashboard/products/${saved.id}`);
    },
    onError: (e) => {
      const mapped: Record<string, string> = {};
      for (const [key, message] of Object.entries(apiFieldErrors(e))) mapped[serverKeyToProductField(key)] = message;
      setErrors(mapped);
      toast.error(Object.keys(mapped).length > 0 ? "Please fix the highlighted fields." : errorMessage(e));
    },
  });

  const remove = useMutation({
    mutationFn: () => adminApi.delete(`products/${product?.id}`),
    onSuccess: async () => {
      toast.success("Product deleted");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      router.replace("/dashboard/products");
    },
    onError: (e) => { setConfirmDelete(false); toast.error(errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateProductForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return toast.error("Please fix the highlighted fields.");
    save.mutate(formToPayload(form));
  }

  function addImages(items: MediaItem[]) {
    const existing = new Set(form.images.map((i) => i.mediaId));
    patch({ images: [...form.images, ...items.filter((m) => !existing.has(m.id)).map((m) => ({ mediaId: m.id, url: m.url, alt: m.alt ?? "" }))].slice(0, 10) });
  }

  const moveImage = (index: number, dir: -1 | 1) => {
    const images = [...form.images];
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    patch({ images });
  };

  const setOptionName = (i: number, value: string) => patch({ optionNames: form.optionNames.map((n, idx) => (idx === i ? value : n)) });
  const addOption = () => patch({ optionNames: [...form.optionNames, ""], variants: form.variants.map((v) => ({ ...v, values: [...v.values, ""] })) });
  const removeOption = (i: number) => patch({ optionNames: form.optionNames.filter((_, idx) => idx !== i), variants: form.variants.map((v) => ({ ...v, values: v.values.filter((_, idx) => idx !== i) })) });
  const addVariant = () => patch({ optionNames: form.optionNames.length === 0 ? ["Size"] : form.optionNames, variants: [...form.variants, { values: Array(Math.max(form.optionNames.length, 1)).fill(""), sku: "", price: null, stock: 0 }] });
  const updateVariant = (i: number, changes: Partial<ProductForm["variants"][number]>) => patch({ variants: form.variants.map((v, idx) => (idx === i ? { ...v, ...changes } : v)) });

  return (
    <>
      <PageHeader
        title={product ? product.name : "New product"}
        description={product ? `Slug: ${product.slug}` : "Add a product to your catalogue."}
        actions={<>
          <Link href="/dashboard/products" className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">Back</Link>
          {product ? <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="!text-red-700">Delete</Button> : null}
        </>}
      />

      <form onSubmit={submit} noValidate className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Details" />
              <CardBody className="space-y-4">
                <TextInput label="Name" name="name" value={form.name} onChange={(e) => patch({ name: e.target.value })} error={errors.name} />
                <TextInput label="Short description" name="shortDescription" value={form.shortDescription} onChange={(e) => patch({ shortDescription: e.target.value })} error={errors.shortDescription} hint="Shown on product cards and in search results." />
                <TextArea label="Description" name="description" rows={6} value={form.description} onChange={(e) => patch({ description: e.target.value })} error={errors.description} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Slug" name="slug" value={form.slug} onChange={(e) => patch({ slug: e.target.value })} error={errors.slug} hint="Leave empty to generate from the name." />
                  <TextInput label="SKU" name="sku" value={form.sku} onChange={(e) => patch({ sku: e.target.value })} error={errors.sku} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Images" description="The first image is the main one." action={<Button type="button" variant="secondary" onClick={() => setPickerOpen(true)} disabled={form.images.length >= 10}>Add images</Button>} />
              <CardBody>
                {form.images.length === 0 ? <p className="text-sm text-neutral-500">No images yet.</p> : (
                  <ul className="space-y-3">
                    {form.images.map((img, i) => (
                      <li key={img.mediaId} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url ?? ""} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                        <input aria-label={`Alt text for image ${i + 1}`} placeholder="Describe the image (alt text)" value={img.alt} onChange={(e) => patch({ images: form.images.map((x, idx) => (idx === i ? { ...x, alt: e.target.value } : x)) })} className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm" />
                        <span className="flex gap-1">
                          <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveImage(i, -1)} className="rounded border px-2 py-1 text-sm disabled:opacity-30">↑</button>
                          <button type="button" aria-label="Move down" disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)} className="rounded border px-2 py-1 text-sm disabled:opacity-30">↓</button>
                          <button type="button" aria-label="Remove image" onClick={() => patch({ images: form.images.filter((_, idx) => idx !== i) })} className="rounded border px-2 py-1 text-sm text-red-700">✕</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {errors.images ? <p role="alert" className="mt-2 text-sm text-red-600">{errors.images}</p> : null}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Pricing" description="Enter amounts in your store currency, e.g. 1500.00" />
              <CardBody className="grid gap-4 sm:grid-cols-3">
                <MoneyField label="Price" currency={currency} value={form.price} onChange={(price) => patch({ price })} error={errors.price} />
                <MoneyField label="Compare-at price" currency={currency} value={form.compareAtPrice} onChange={(compareAtPrice) => patch({ compareAtPrice })} optional error={errors.compareAtPrice} hint="Shows a discount if higher than the price." />
                <MoneyField label="Cost per item" currency={currency} value={form.costPrice} onChange={(costPrice) => patch({ costPrice })} optional error={errors.costPrice} hint="Only visible to you." />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Variants" description="Sizes, colours or any option customers choose." action={<Button type="button" variant="secondary" onClick={addVariant}>Add variant</Button>} />
              <CardBody className="space-y-4">
                {!hasVariants ? <p className="text-sm text-neutral-500">This product has no variants. Add one if it comes in different sizes, colours, etc.</p> : (
                  <>
                    <div>
                      <p className="mb-2 text-sm font-medium">Options</p>
                      <div className="flex flex-wrap items-end gap-3">
                        {form.optionNames.map((name, i) => (
                          <div key={i} className="flex items-end gap-1">
                            <TextInput label={`Option ${i + 1}`} value={name} onChange={(e) => setOptionName(i, e.target.value)} error={errors[`optionNames.${i}`]} placeholder="e.g. Size" />
                            <button type="button" aria-label={`Remove option ${name || i + 1}`} onClick={() => removeOption(i)} className="mb-1 rounded border px-2 py-2 text-sm text-red-700">✕</button>
                          </div>
                        ))}
                        {form.optionNames.length < MAX_OPTIONS ? <Button type="button" variant="ghost" onClick={addOption}>+ Option</Button> : null}
                      </div>
                      {errors.optionNames ? <p role="alert" className="mt-1 text-sm text-red-600">{errors.optionNames}</p> : null}
                    </div>

                    <div className={tableClasses.wrap}>
                      <table className={tableClasses.table}>
                        <thead><tr>
                          {form.optionNames.map((n, i) => <th key={i} className={tableClasses.th}>{n || `Option ${i + 1}`}</th>)}
                          <th className={tableClasses.th}>SKU</th><th className={tableClasses.th}>Price override</th><th className={tableClasses.th}>Stock</th><th className={tableClasses.th}><span className="sr-only">Remove</span></th>
                        </tr></thead>
                        <tbody>
                          {form.variants.map((v, i) => (
                            <tr key={v.id ?? i}>
                              {form.optionNames.map((_, oi) => (
                                <td key={oi} className={tableClasses.td}>
                                  <input aria-label={`Variant ${i + 1} ${form.optionNames[oi] || "option"}`} value={v.values[oi] ?? ""} onChange={(e) => updateVariant(i, { values: v.values.map((x, idx) => (idx === oi ? e.target.value : x)) })} className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                                </td>
                              ))}
                              <td className={tableClasses.td}><input aria-label={`Variant ${i + 1} SKU`} value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />{errors[`variants.${i}.sku`] ? <p role="alert" className="text-xs text-red-600">{errors[`variants.${i}.sku`]}</p> : null}</td>
                              <td className={tableClasses.td}><div className="w-32"><MoneyField label={`Variant ${i + 1} price override`} hideLabel value={v.price} onChange={(price) => updateVariant(i, { price })} optional /></div></td>
                              <td className={tableClasses.td}><input type="number" min={0} aria-label={`Variant ${i + 1} stock`} value={v.stock} onChange={(e) => updateVariant(i, { stock: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} disabled={!!v.id && form.trackInventory} title={v.id ? "Use the inventory panel to adjust stock of an existing variant" : undefined} className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm disabled:bg-neutral-100" />{errors[`variants.${i}.stock`] ? <p role="alert" className="text-xs text-red-600">{errors[`variants.${i}.stock`]}</p> : null}</td>
                              <td className={tableClasses.td}><button type="button" aria-label={`Remove variant ${i + 1}`} onClick={() => patch({ variants: form.variants.filter((_, idx) => idx !== i) })} className="rounded border px-2 py-1 text-red-700">✕</button>
                                {variantValuesError(errors, i) ? <p role="alert" className="text-xs text-red-600">{variantValuesError(errors, i)}</p> : null}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Status" />
              <CardBody className="space-y-4">
                <Select label="Visibility" value={form.status} onChange={(e) => patch({ status: e.target.value as ProductForm["status"] })}>
                  <option value="draft">Draft (hidden)</option><option value="active">Active (on your store)</option><option value="archived">Archived (hidden)</option>
                </Select>
                <Select label="Category" value={form.categoryId} onChange={(e) => patch({ categoryId: e.target.value })} error={errors.categoryId}>
                  <option value="">No category</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Inventory" />
              <CardBody className="space-y-4">
                <Toggle label="Track inventory" description="Stop selling at zero stock." checked={form.trackInventory} onChange={(trackInventory) => patch({ trackInventory })} />
                {form.trackInventory && !hasVariants ? (
                  product ? <p className="text-sm">In stock: <strong>{product.stock}</strong>. Adjust below.</p> : (
                    <TextInput label="Starting stock" type="number" min={0} value={form.stock} onChange={(e) => patch({ stock: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} error={errors.stock} />
                  )
                ) : null}
                {hasVariants ? <p className="text-xs text-neutral-500">Stock is tracked per variant.</p> : null}
              </CardBody>
            </Card>

            <Button type="submit" disabled={save.isPending} className="w-full">{save.isPending ? "Saving…" : product ? "Save changes" : "Create product"}</Button>
          </div>
        </div>
      </form>

      {product ? <InventoryPanel product={product} /> : null}

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addImages} folder="products" />
      <ConfirmDialog open={confirmDelete} title="Delete product?" message={`“${product?.name}” will be removed from your store. Existing orders keep their history.`} busy={remove.isPending} onConfirm={() => remove.mutate()} onClose={() => setConfirmDelete(false)} />
    </>
  );
}

function InventoryPanel({ product }: { product: AdminProduct }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"restock" | "manual_adjustment">("restock");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const movements = useQuery({ queryKey: ["inventory", product.id, page], queryFn: () => adminApi.list<InventoryMovement>(`products/${product.id}/inventory`, { page }) });

  const adjust = useMutation({
    mutationFn: (body: { variant_id: string | null; delta: number; reason: string; note: string | null }) => adminApi.post(`products/${product.id}/inventory`, body),
    onSuccess: async () => {
      toast.success("Stock updated");
      setDelta(""); setNote("");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory", product.id] }), queryClient.invalidateQueries({ queryKey: ["product", product.id] }), queryClient.invalidateQueries({ queryKey: ["products"] })]);
    },
    onError: (e) => setErrors({ delta: errorMessage(e) }),
  });

  if (!product.trackInventory) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = stockAdjustSchema.safeParse({ delta: delta.trim() === "" ? Number.NaN : Number(delta), reason, note });
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    adjust.mutate({ variant_id: product.variants.length > 0 ? variantId : null, delta: parsed.data.delta, reason: parsed.data.reason, note: parsed.data.note || null });
  }

  const current = product.variants.length > 0 ? product.variants.find((v) => v.id === variantId)?.stock : product.stock;

  return (
    <Card className="mt-6">
      <CardHeader title="Adjust stock" description="Every change is recorded in the history below." />
      <CardBody>
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_12rem_1fr_auto] lg:items-start">
          {product.variants.length > 0 ? (
            <Select label="Variant" value={variantId} onChange={(e) => setVariantId(e.target.value)}>{product.variants.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.stock})</option>)}</Select>
          ) : <div><p className="mb-1 text-sm font-medium">Current stock</p><p className="py-2 text-lg font-semibold">{current}</p></div>}
          <TextInput label="Change (+/−)" inputMode="numeric" placeholder="+10 or -3" value={delta} onChange={(e) => setDelta(e.target.value)} error={errors.delta} />
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}><option value="restock">Restock</option><option value="manual_adjustment">Correction</option></Select>
          <TextInput label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} error={errors.note} />
          <div className="sm:col-span-2 lg:col-span-1 lg:pt-6"><Button type="submit" disabled={adjust.isPending}>{adjust.isPending ? "Saving…" : "Apply"}</Button></div>
        </form>

        <h3 className="mb-2 mt-8 text-sm font-semibold">History</h3>
        {movements.isLoading ? <Spinner /> : movements.data && movements.data.items.length === 0 ? <EmptyState title="No stock movements yet" /> : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>When</th><th className={tableClasses.th}>Reason</th><th className={`${tableClasses.th} text-right`}>Change</th><th className={`${tableClasses.th} text-right`}>Stock after</th><th className={tableClasses.th}>Note</th></tr></thead>
                <tbody>
                  {movements.data?.items.map((m, i) => (
                    <tr key={i}>
                      <td className={tableClasses.td}>{new Date(m.createdAt).toLocaleString()}</td>
                      <td className={tableClasses.td}>{m.reason.replace(/_/g, " ")}</td>
                      <td className={`${tableClasses.td} text-right font-medium ${m.delta < 0 ? "text-red-700" : "text-emerald-700"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                      <td className={`${tableClasses.td} text-right`}>{m.stockAfter}</td>
                      <td className={tableClasses.td}>{m.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {movements.data ? <Pager meta={movements.data.meta} onPage={setPage} /> : null}
          </>
        )}
        {errors.note ? <Notice tone="red">{errors.note}</Notice> : null}
      </CardBody>
    </Card>
  );
}
