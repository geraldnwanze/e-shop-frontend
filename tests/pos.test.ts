import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addToSale, changeDue, clampQuantity, isSellable, lineKey, removeLine, saleTotals, setLineQuantity, toSalePayload } from "../lib/admin/pos.ts";
import type { AdminProduct, AdminVariant } from "../lib/admin/types.ts";

const variant = (over: Partial<AdminVariant> = {}): AdminVariant => ({ id: "v1", name: "Tub", sku: null, options: {}, price: 270000, stock: 3, ...over } as AdminVariant);
const product = (over: Partial<AdminProduct> = {}): AdminProduct => ({
  id: "p1", name: "Pistachio", slug: "pistachio", description: null, shortDescription: null, sku: null, price: 150000, compareAtPrice: null, costPrice: null,
  status: "active", stock: 5, trackInventory: true, category: null, variants: [], images: [], createdAt: "", ...over,
});

describe("addToSale", () => {
  it("adds a line at the product price, then merges repeats", () => {
    let lines = addToSale([], product(), null);
    lines = addToSale(lines, product(), null);

    assert.equal(lines.length, 1);
    assert.equal(lines[0].quantity, 2);
    assert.equal(lines[0].unitPrice, 150000);
  });

  it("uses the variant's price and keeps variants on separate lines", () => {
    const p = product({ variants: [variant(), variant({ id: "v2", name: "Cup", price: null, stock: 4 })] });
    const lines = addToSale(addToSale([], p, p.variants[0]), p, p.variants[1]);

    assert.deepEqual(lines.map((l) => [l.variantName, l.unitPrice]), [["Tub", 270000], ["Cup", 150000]]);
  });

  it("never goes past stock on hand and ignores sold-out items", () => {
    const p = product({ stock: 1 });
    assert.equal(addToSale(addToSale([], p, null), p, null)[0].quantity, 1);
    assert.deepEqual(addToSale([], product({ stock: 0 }), null), []);
  });

  it("does not limit untracked products to their stored stock", () => {
    const p = product({ trackInventory: false, stock: 0 });

    assert.equal(addToSale(addToSale([], p, null), p, null)[0].quantity, 2);
  });
});

describe("quantities", () => {
  it("clamps to between 1 and the stock", () => {
    assert.equal(clampQuantity(0, 5), 1);
    assert.equal(clampQuantity(99, 5), 5);
    assert.equal(clampQuantity(Number.NaN, 5), 1);
    assert.equal(clampQuantity(2.9, null), 2);
  });

  it("changes and removes a line by key", () => {
    const lines = addToSale([], product(), null);
    const key = lineKey(lines[0]);

    assert.equal(setLineQuantity(lines, key, 3)[0].quantity, 3);
    assert.deepEqual(removeLine(lines, key), []);
  });
});

describe("totals and change", () => {
  it("caps the discount at the subtotal", () => {
    const lines = [{ ...addToSale([], product(), null)[0], quantity: 2 }];

    assert.deepEqual(saleTotals(lines, 50000), { subtotal: 300000, discount: 50000, total: 250000 });
    assert.deepEqual(saleTotals(lines, 999999), { subtotal: 300000, discount: 300000, total: 0 });
    assert.equal(saleTotals(lines, -5).discount, 0);
  });

  it("works out change and flags short cash", () => {
    assert.equal(changeDue(300000, 350000), 50000);
    assert.equal(changeDue(300000, 300000), 0);
    assert.equal(changeDue(300000, 100000), null);
    assert.equal(changeDue(300000, null), null);
  });
});

describe("isSellable", () => {
  it("needs an active product with stock somewhere", () => {
    assert.equal(isSellable(product()), true);
    assert.equal(isSellable(product({ status: "draft" })), false);
    assert.equal(isSellable(product({ stock: 0 })), false);
    assert.equal(isSellable(product({ stock: 0, trackInventory: false })), true);
    assert.equal(isSellable(product({ variants: [variant({ stock: 0 })] })), false);
  });
});

describe("toSalePayload", () => {
  const lines = addToSale([], product(), null);
  const base = { lines, method: "cash" as const, tendered: null, discount: 0, customer: { name: " ", email: "", phone: "" }, notes: "" };

  it("sends ids and quantities only, never prices", () => {
    const payload = toSalePayload(base);

    assert.deepEqual(payload.items, [{ product_id: "p1", variant_id: null, quantity: 1 }]);
    assert.equal(JSON.stringify(payload).includes("150000"), true, "cash tendered defaults to the total");
    assert.equal("unit_price" in payload.items[0], false);
  });

  it("tenders the exact total by default and only for cash", () => {
    assert.equal(toSalePayload(base).amount_tendered, 150000);
    assert.equal(toSalePayload({ ...base, tendered: 200000 }).amount_tendered, 200000);
    assert.equal(toSalePayload({ ...base, method: "transfer" }).amount_tendered, null);
  });

  it("turns blank customer details into nulls", () => {
    assert.deepEqual(toSalePayload(base).customer, { name: null, email: null, phone: null });
    assert.equal(toSalePayload(base).discount_amount, null);
  });
});
