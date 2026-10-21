import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readableOn } from "../lib/color.ts";
import { discountPercent, formatMoney } from "../lib/money.ts";

describe("money", () => {
  it("formats minor units", () => {
    assert.equal(formatMoney(150000, "USD"), "$1,500.00");
    assert.equal(formatMoney(5, "USD"), "$0.05");
  });

  it("does not throw on an invalid currency code", () => {
    assert.equal(formatMoney(1500, "NOPE!"), "15.00 NOPE!");
  });

  it("computes discount percentage only when there is a real markdown", () => {
    assert.equal(discountPercent(75, 100), 25);
    assert.equal(discountPercent(100, 100), null);
    assert.equal(discountPercent(100, null), null);
    assert.equal(discountPercent(120, 100), null);
  });
});

describe("readableOn", () => {
  it("chooses contrasting text colours", () => {
    assert.equal(readableOn("#ffffff"), "#000000");
    assert.equal(readableOn("#111827"), "#ffffff");
    assert.equal(readableOn("#f59e0b"), "#000000");
  });

  it("falls back safely for invalid input", () => {
    assert.equal(readableOn("red"), "#ffffff");
    assert.equal(readableOn("#12"), "#ffffff");
  });
});
