import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { discountStatus } from "../lib/admin/discounts.ts";

const now = new Date("2026-10-10T12:00:00Z");
const base = { isActive: true, usedCount: 0, maxUses: 1, startsAt: null, endsAt: "2026-10-17T12:00:00Z" };

describe("discountStatus", () => {
  it("is active while valid and unused", () => {
    assert.equal(discountStatus(base, now), "Active");
    assert.equal(discountStatus({ ...base, endsAt: null, maxUses: null }, now), "Active");
  });

  it("calls a fully redeemed code used, even if it has since expired or been paused", () => {
    assert.equal(discountStatus({ ...base, usedCount: 1 }, now), "Used");
    assert.equal(discountStatus({ ...base, usedCount: 1, endsAt: "2026-10-01T00:00:00Z" }, now), "Used");
    assert.equal(discountStatus({ ...base, usedCount: 1, isActive: false }, now), "Used");
  });

  it("recognises paused, expired and not-yet-started codes", () => {
    assert.equal(discountStatus({ ...base, isActive: false }, now), "Paused");
    assert.equal(discountStatus({ ...base, endsAt: "2026-10-09T00:00:00Z" }, now), "Expired");
    assert.equal(discountStatus({ ...base, startsAt: "2026-10-11T00:00:00Z" }, now), "Scheduled");
  });

  it("leaves codes with spare uses active", () => {
    assert.equal(discountStatus({ ...base, maxUses: 100, usedCount: 99 }, now), "Active");
  });
});
