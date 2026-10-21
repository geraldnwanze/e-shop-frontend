import type { Product } from "./types.ts";

export interface CatalogueSection {
  slug: string | null;
  name: string;
  products: Product[];
}

const UNCATEGORISED = "Other products";

/** Groups products by category (A–Z), keeping the API order inside each group and putting uncategorised items last. */
export function groupByCategory(products: Product[]): CatalogueSection[] {
  const sections = new Map<string, CatalogueSection>();

  for (const product of products) {
    const key = product.category?.slug ?? "";
    const section = sections.get(key) ?? { slug: product.category?.slug ?? null, name: product.category?.name ?? UNCATEGORISED, products: [] };
    section.products.push(product);
    sections.set(key, section);
  }

  return [...sections.values()].sort((a, b) => (a.slug === null ? 1 : b.slug === null ? -1 : a.name.localeCompare(b.name)));
}

/** The line a merchant sends to customers, with the catalogue link underneath. */
export function catalogueShareText(storeName: string, url: string): string {
  return `Browse the ${storeName} catalogue and order here:\n${url}`;
}

/** Share through WhatsApp's chooser (no recipient), so the merchant picks the chat or status. */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
