import "server-only";

import { notFound } from "next/navigation";

import { ApiError, getStoreBundle } from "./api/server";
import { env } from "./env";
import { canonicalOrigin } from "./seo";
import type { StoreBundle } from "./types";

/** Resolve a hostname to its store, mapping API failures to the right page behaviour. */
export async function loadStore(host: string): Promise<{ bundle: StoreBundle; origin: string } | { unavailable: true }> {
  try {
    const bundle = await getStoreBundle(host);

    return { bundle, origin: canonicalOrigin(bundle, host, env.scheme) };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) notFound();
      if (error.status === 403) return { unavailable: true };
    }
    throw error;
  }
}

/** Like loadStore but for pages: an unavailable store behaves as not found. */
export async function requireStore(host: string): Promise<{ bundle: StoreBundle; origin: string }> {
  const result = await loadStore(host);
  if ("unavailable" in result) notFound();

  return result;
}
