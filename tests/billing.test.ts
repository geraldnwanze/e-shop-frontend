import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { periodLabel } from "../lib/admin/billing-types.ts";

describe("periodLabel", () => {
  it("names the billing periods the way the billing page and pricing show them", () => {
    assert.equal(periodLabel(1), "Monthly");
    assert.equal(periodLabel(3), "Every 3 months");
    assert.equal(periodLabel(12), "Yearly");
  });
});
