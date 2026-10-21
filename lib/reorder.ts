import type { OrderItem } from "./types.ts";

/** Structural check, so this module has no runtime imports (and can be unit-tested without the API client). */
const isApiError = (error: unknown): error is Error & { code: string } => error instanceof Error && error.name === "ApiError";

export interface ReorderResult {
  added: number;
  skipped: { name: string; reason: string }[];
}

type Add = (input: { productId: string; variantId: string | null; quantity: number }) => Promise<unknown>;

/**
 * Put the lines of a past order back into the cart one by one. Lines that can no longer be bought
 * (product removed or hidden, option gone, not enough stock) are skipped and reported instead of
 * stopping the rest.
 */
export async function reorder(items: OrderItem[], add: Add): Promise<ReorderResult> {
  const result: ReorderResult = { added: 0, skipped: [] };

  for (const item of items) {
    const label = item.variantName ? `${item.name} (${item.variantName})` : item.name;

    if (!item.productId) {
      result.skipped.push({ name: label, reason: "No longer available" });
      continue;
    }

    try {
      await add({ productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity });
      result.added += 1;
    } catch (error) {
      if (!isApiError(error)) throw error;
      result.skipped.push({ name: label, reason: error.code === "INSUFFICIENT_STOCK" ? "Not enough in stock" : "No longer available" });
    }
  }

  return result;
}
