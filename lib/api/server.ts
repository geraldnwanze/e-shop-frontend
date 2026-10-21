import "server-only";

import { cache } from "react";

import { env } from "../env";
import type { ApiEnvelope, Category, Paginated, Product, StoreBundle } from "../types";
import { ApiError, toApiError } from "./errors";

/**
 * Server-side storefront API access.
 *
 * Tenant safety: the visitor's hostname is sent in X-Storefront-Host AND appended
 * to the URL as `_h`. The query param makes the Next data-cache key unique per
 * host, so one store's cached response can never be served for another host,
 * regardless of how headers participate in cache keys.
 */
async function request<T>(host: string, path: string, query: Record<string, string | number | undefined> = {}, revalidate = env.revalidate) {
  const url = new URL(`${env.apiUrl}/storefront/${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  url.searchParams.set("_h", host);

  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Storefront-Host": host },
    next: { revalidate, tags: [`tenant:${host}`] },
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || body === null) {
    throw toApiError(response.status, body);
  }

  return body;
}

/** Store, theme, theme configuration and public settings for a hostname. Deduped per render. */
export const getStoreBundle = cache(async (host: string): Promise<StoreBundle> => (await request<StoreBundle>(host, "store")).data);

export interface ProductQuery {
  category?: string;
  search?: string;
  sort?: string;
  page?: number;
  per_page?: number;
  min_price?: number;
  max_price?: number;
}

export async function getProducts(host: string, query: ProductQuery = {}): Promise<Paginated<Product>> {
  const body = await request<Product[]>(host, "products", { ...query });

  return {
    items: body.data,
    currentPage: body.meta.currentPage ?? 1,
    lastPage: body.meta.lastPage ?? 1,
    total: body.meta.total ?? body.data.length,
  };
}

export async function getProduct(host: string, slug: string): Promise<Product | null> {
  try {
    return (await request<Product>(host, `products/${encodeURIComponent(slug)}`)).data;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function getPage(host: string, slug: string): Promise<{ title: string; slug: string; body: string } | null> {
  try {
    return (await request<{ title: string; slug: string; body: string }>(host, `pages/${encodeURIComponent(slug)}`)).data;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/** A few other products to suggest on a product page. A failure just means no suggestions. */
export async function getRelatedProducts(host: string, slug: string): Promise<Product[]> {
  try {
    return (await request<Product[]>(host, `products/${encodeURIComponent(slug)}/related`)).data;
  } catch {
    return [];
  }
}

export async function getCategories(host: string): Promise<Category[]> {
  return (await request<Category[]>(host, "categories")).data;
}

export { ApiError };
