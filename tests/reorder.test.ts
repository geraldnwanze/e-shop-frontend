import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reorder } from "../lib/reorder.ts";
import type { OrderItem } from "../lib/types.ts";

const apiError = (code: string) => Object.assign(new Error(code), { name: "ApiError", code });

const item = (over: Partial<OrderItem>): OrderItem => ({ productId: "p1", variantId: null, name: "Vanilla", variantName: null, sku: null, unitPrice: 100, quantity: 2, total: 200, ...over });

describe("reorder", () => {
  it("adds every line with its product, option and quantity", async () => {
    const calls: unknown[] = [];
    const result = await reorder([item({}), item({ productId: "p2", variantId: "v1", quantity: 1 })], async (input) => { calls.push(input); });

    assert.deepEqual(calls, [{ productId: "p1", variantId: null, quantity: 2 }, { productId: "p2", variantId: "v1", quantity: 1 }]);
    assert.deepEqual(result, { added: 2, skipped: [] });
  });

  it("skips lines that cannot be bought and keeps going", async () => {
    const result = await reorder(
      [item({ productId: null, name: "Gone" }), item({ productId: "p2", name: "Low", variantName: "Large" }), item({ productId: "p3", name: "Fine" })],
      async (input) => { if (input.productId === "p2") throw apiError("INSUFFICIENT_STOCK"); },
    );

    assert.equal(result.added, 1);
    assert.deepEqual(result.skipped, [{ name: "Gone", reason: "No longer available" }, { name: "Low (Large)", reason: "Not enough in stock" }]);
  });

  it("does not swallow unexpected errors", async () => {
    await assert.rejects(reorder([item({})], async () => { throw new Error("boom"); }), /boom/);
  });
});
