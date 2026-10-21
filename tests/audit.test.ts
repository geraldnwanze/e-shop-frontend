import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { actionTone, changeRows, describeAction, filterQuery } from "../lib/admin/audit.ts";

describe("audit log helpers", () => {
  it("words an action in plain language", () => {
    assert.equal(describeAction("product.updated"), "Product updated");
    assert.equal(describeAction("shipping_zone.created"), "Shipping zone created");
    assert.equal(describeAction("auth.login_failed"), "Sign-in: login failed");
    assert.equal(describeAction("user.role_changed"), "User role changed");
  });

  it("flags risky actions", () => {
    for (const a of ["auth.login_failed", "tenant.suspended", "product.deleted", "user.revoke_tokens"]) assert.equal(actionTone(a), "red", a);
    for (const a of ["user.role_changed", "payment_gateway.updated", "auth.password_reset"]) assert.equal(actionTone(a), "amber", a);
    assert.equal(actionTone("product.created"), "green");
    assert.equal(actionTone("product.updated"), "blue");
  });

  it("turns changes into before/after rows and plain values", () => {
    assert.deepEqual(changeRows({ price: [1000, 1200], note: "x", gone: [null, "set"] }), [
      { field: "price", before: "1000", after: "1200" },
      { field: "note", value: "x" },
      { field: "gone", before: "empty", after: "set" },
    ]);
    assert.deepEqual(changeRows(null), []);
  });

  it("builds the export query without empty filters", () => {
    assert.equal(filterQuery({ search: "", action: "plan.updated", from: "2026-01-01" }), "action=plan.updated&from=2026-01-01");
  });
});
