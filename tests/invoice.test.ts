import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasInvoice } from "../lib/invoice.ts";

describe("hasInvoice", () => {
  it("is true once the order has been paid, even if later refunded", () => {
    for (const status of ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]) assert.equal(hasInvoice(status), true, status);
  });

  it("is false while unpaid or failed", () => {
    for (const status of ["PENDING", "FAILED", ""]) assert.equal(hasInvoice(status), false, status);
  });
});
