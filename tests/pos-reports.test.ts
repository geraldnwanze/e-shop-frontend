import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeVariance, periodRange, shiftDuration } from "../lib/admin/pos-reports.ts";

describe("periodRange", () => {
  const now = new Date(2026, 9, 10, 15, 30);

  it("covers today, the last 7 and the last 30 days inclusively", () => {
    assert.deepEqual(periodRange("today", now), { from: "2026-10-10", to: "2026-10-10" });
    assert.deepEqual(periodRange("7d", now), { from: "2026-10-04", to: "2026-10-10" });
    assert.deepEqual(periodRange("30d", now), { from: "2026-09-11", to: "2026-10-10" });
  });

  it("crosses a year boundary", () => {
    assert.equal(periodRange("7d", new Date(2026, 0, 3)).from, "2025-12-28");
  });
});

describe("describeVariance", () => {
  it("labels the cash count", () => {
    assert.deepEqual(describeVariance(null), { label: "Not counted", tone: "neutral" });
    assert.deepEqual(describeVariance(0), { label: "Balanced", tone: "green" });
    assert.deepEqual(describeVariance(500), { label: "Over", tone: "amber" });
    assert.deepEqual(describeVariance(-500), { label: "Short", tone: "red" });
  });
});

describe("shiftDuration", () => {
  it("formats hours and minutes, measuring open shifts to now", () => {
    const open = "2026-10-10T09:00:00Z";

    assert.equal(shiftDuration(open, "2026-10-10T11:05:00Z"), "2h 05m");
    assert.equal(shiftDuration(open, "2026-10-10T09:45:00Z"), "45m");
    assert.equal(shiftDuration(open, null, new Date("2026-10-10T10:30:00Z")), "1h 30m");
    assert.equal(shiftDuration(open, "2026-10-10T08:00:00Z"), "0m");
  });
});
