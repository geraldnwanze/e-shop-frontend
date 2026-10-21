/**
 * Pure product-form logic: API product <-> editable form state <-> API payload,
 * plus validation. No React and no path aliases so it runs under node --test.
 */
import { z } from "zod";

import type { AdminProduct, ProductStatus } from "./types.ts";

export interface VariantForm {
  id?: string;
  values: string[]; // one value per option name
  sku: string;
  price: number | null; // minor units, null = use product price
  stock: number;
}

export interface ImageForm {
  mediaId: string;
  url: string | null;
  alt: string;
}

export interface ProductForm {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  status: ProductStatus;
  trackInventory: boolean;
  stock: number;
  categoryId: string;
  optionNames: string[]; // up to 3, e.g. ["Size", "Color"]
  variants: VariantForm[];
  images: ImageForm[];
}

export const MAX_OPTIONS = 3;

export function emptyProductForm(): ProductForm {
  return { name: "", slug: "", sku: "", shortDescription: "", description: "", price: null, compareAtPrice: null, costPrice: null, status: "draft", trackInventory: true, stock: 0, categoryId: "", optionNames: [], variants: [], images: [] };
}

export function productToForm(p: AdminProduct): ProductForm {
  const optionNames = p.variants[0] ? Object.keys(p.variants[0].options) : [];

  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? "",
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    costPrice: p.costPrice,
    status: p.status,
    trackInventory: p.trackInventory,
    stock: p.variants.length > 0 ? 0 : p.stock,
    categoryId: p.category?.id ?? "",
    optionNames,
    variants: p.variants.map((v) => ({ id: v.id, values: optionNames.map((n) => v.options[n] ?? ""), sku: v.sku ?? "", price: v.price, stock: v.stock })),
    images: p.images.filter((i) => i.mediaId).map((i) => ({ mediaId: i.mediaId as string, url: i.url, alt: i.alt ?? "" })),
  };
}

const blank = (s: string) => (s.trim() === "" ? null : s.trim());

/** Build the API body. `variants` is always sent so removed rows are deleted; the server ignores `stock` when variants exist. */
export function formToPayload(f: ProductForm) {
  const names = f.optionNames.map((n) => n.trim()).filter(Boolean);

  return {
    name: f.name.trim(),
    ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
    sku: blank(f.sku),
    short_description: blank(f.shortDescription),
    description: blank(f.description),
    price: f.price,
    compare_at_price: f.compareAtPrice,
    cost_price: f.costPrice,
    status: f.status,
    track_inventory: f.trackInventory,
    stock: f.variants.length > 0 ? 0 : f.stock,
    category_id: f.categoryId || null,
    variants: f.variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      options: Object.fromEntries(names.map((n, i) => [n, v.values[i]?.trim() ?? ""])),
      sku: blank(v.sku),
      price: v.price,
      stock: v.stock,
    })),
    images: f.images.map((i) => ({ media_id: i.mediaId, alt: blank(i.alt) })),
  };
}

const money = z.number().int().min(0).nullable();

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(255),
    slug: z.string().trim().max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only").or(z.literal("")),
    sku: z.string().trim().max(100),
    price: z.number({ error: "Price is required" }).int().min(0, "Price is required"),
    compareAtPrice: money,
    costPrice: money,
    stock: z.number().int().min(0, "Stock cannot be negative").max(10_000_000),
    optionNames: z.array(z.string().trim().min(1, "Option name is required").max(40)).max(MAX_OPTIONS),
    variants: z.array(z.object({ values: z.array(z.string().trim().min(1, "Required").max(60)), sku: z.string().max(100), price: money, stock: z.number().int().min(0, "Cannot be negative").max(10_000_000) })).max(100),
  })
  .superRefine((v, ctx) => {
    if (v.compareAtPrice !== null && v.price !== null && v.compareAtPrice < v.price) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Must be at least the price" });
    }
    if (v.variants.length > 0 && v.optionNames.length === 0) {
      ctx.addIssue({ code: "custom", path: ["optionNames"], message: "Add at least one option (e.g. Size) for variants" });
    }
    const seen = new Set<string>();
    v.variants.forEach((variant, i) => {
      const key = variant.values.join("|").toLowerCase();
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["variants", i, "values"], message: "Duplicate variant" });
      seen.add(key);
    });
  });

/** Returns a flat map like { "name": "...", "variants.0.stock": "..." }, empty when valid. */
export function validateProductForm(f: ProductForm): Record<string, string> {
  const parsed = schema.safeParse({ ...f, price: f.price ?? -1 });
  if (parsed.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** Map a Laravel error key ("variants.0.sku", "images.1.media_id", "category_id") onto form keys. */
export function serverKeyToProductField(key: string): string {
  return key
    .replace(/^compare_at_price$/, "compareAtPrice")
    .replace(/^cost_price$/, "costPrice")
    .replace(/^short_description$/, "shortDescription")
    .replace(/^category_id$/, "categoryId")
    .replace(/^track_inventory$/, "trackInventory")
    .replace(/^variants\.(\d+)\.options.*$/, "variants.$1.values");
}

/** First error for a variant's option values (covers "variants.N.values" and "variants.N.values.M"). */
export function variantValuesError(errors: Record<string, string>, index: number): string | undefined {
  const prefix = `variants.${index}.values`;
  const key = Object.keys(errors).find((k) => k === prefix || k.startsWith(prefix + "."));

  return key ? errors[key] : undefined;
}
