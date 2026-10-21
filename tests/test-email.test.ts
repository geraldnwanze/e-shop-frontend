import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { testEmailPayload } from "../lib/admin/test-email.ts";

describe("testEmailPayload", () => {
  it("sends only the type for the review summary", () => {
    assert.deepEqual(testEmailPayload("review_digest", 20), { type: "review_digest" });
  });

  it("sends only the type for the review request", () => {
    assert.deepEqual(testEmailPayload("review_request", 20), { type: "review_request" });
  });

  it("sends only the type for the first reminder", () => {
    assert.deepEqual(testEmailPayload("abandoned_cart_first", 20), { type: "abandoned_cart_first" });
  });

  it("includes the on-screen percentage for the follow-up, including 0", () => {
    assert.deepEqual(testEmailPayload("abandoned_cart_followup", 20), { type: "abandoned_cart_followup", discount_percent: 20 });
    assert.deepEqual(testEmailPayload("abandoned_cart_followup", 0), { type: "abandoned_cart_followup", discount_percent: 0 });
  });

  it("leaves the percentage to the saved setting when the field is blank or out of range", () => {
    for (const bad of [Number.NaN, 51, -1, 2.5]) assert.deepEqual(testEmailPayload("abandoned_cart_followup", bad), { type: "abandoned_cart_followup" }, String(bad));
  });
});
