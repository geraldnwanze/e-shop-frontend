import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reviewActions } from "../lib/admin/reviews.ts";

describe("reviewActions", () => {
  it("offers approve or hide for a new review, hide for a live one and publish for a hidden one", () => {
    assert.deepEqual(reviewActions("pending"), [{ label: "Approve", to: "published" }, { label: "Hide", to: "hidden" }]);
    assert.deepEqual(reviewActions("published"), [{ label: "Hide", to: "hidden" }]);
    assert.deepEqual(reviewActions("hidden"), [{ label: "Publish", to: "published" }]);
  });
});
