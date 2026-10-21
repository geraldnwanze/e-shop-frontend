import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePriceRange } from "../lib/price-filter.ts";

describe("parsePriceRange", () => {
  it("converts typed amounts to minor units", () => {
    assert.deepEqual(parsePriceRange("1,500", "2500.50"), { min: 150000, max: 250050 });
  });

  it("treats empty or invalid input as no limit", () => {
    assert.deepEqual(parsePriceRange("", undefined), { min: null, max: null });
    assert.deepEqual(parsePriceRange("abc", "-5"), { min: null, max: null });
  });

  it("puts a reversed range the right way round", () => {
    assert.deepEqual(parsePriceRange("5000", "1000"), { min: 100000, max: 500000 });
  });

  it("allows a single bound", () => {
    assert.deepEqual(parsePriceRange("100", undefined), { min: 10000, max: null });
    assert.deepEqual(parsePriceRange(undefined, "100"), { min: null, max: 10000 });
  });
});
