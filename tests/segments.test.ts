import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { blankDraft, describeRules, fromApiRules, hasAnyRule, PRESETS, toApiRules, type SegmentDraft } from "../lib/admin/segments.ts";

const draft = (patch: Partial<SegmentDraft>): SegmentDraft => ({ ...blankDraft, ...patch });

describe("toApiRules", () => {
  it("sends nothing for an empty form", () => {
    assert.deepEqual(toApiRules(blankDraft), {});
    assert.equal(hasAnyRule(toApiRules(blankDraft)), false);
  });

  it("includes only the fields that are filled in", () => {
    assert.deepEqual(toApiRules(draft({ minOrders: "2", minSpent: 500000, joinedDays: "30", account: "yes" })), { min_orders: 2, min_spent: 500000, joined_within_days: 30, has_account: true });
  });

  it("keeps 'never ordered' (max 0) but ignores a min of 0, blanks and junk", () => {
    assert.deepEqual(toApiRules(draft({ maxOrders: "0" })), { max_orders: 0 });
    assert.deepEqual(toApiRules(draft({ minOrders: "0", maxOrders: " ", minSpent: 0, joinedDays: "abc", recencyDays: "-3", recency: "within" })), {});
  });

  it("turns the recency choice into one rule or the other, never both", () => {
    assert.deepEqual(toApiRules(draft({ recency: "within", recencyDays: "30" })), { ordered_within_days: 30 });
    assert.deepEqual(toApiRules(draft({ recency: "inactive", recencyDays: "90" })), { inactive_for_days: 90 });
    assert.deepEqual(toApiRules(draft({ recency: "any", recencyDays: "90" })), {});
  });

  it("maps guests to has_account false", () => {
    assert.deepEqual(toApiRules(draft({ account: "no" })), { has_account: false });
  });
});

describe("fromApiRules", () => {
  it("round-trips a segment through the form", () => {
    const rules = { min_orders: 3, max_spent: 900000, inactive_for_days: 60, has_account: false };
    const back = fromApiRules({ id: "s1", name: "X", description: null, rules });

    assert.equal(back.id, "s1");
    assert.equal(back.recency, "inactive");
    assert.deepEqual(toApiRules(back), rules);
  });
});

describe("describeRules", () => {
  it("reads naturally", () => {
    const plain = (lines: string[]) => lines.map((l) => l.replace(/\u00a0/g, " "));

    assert.deepEqual(plain(describeRules({ min_orders: 2, min_spent: 10_000_000, inactive_for_days: 90 }, "NGN")), ["Placed at least 2 paid orders", "Spent at least NGN 100,000.00", "Has not ordered for 90 days"]);
    assert.deepEqual(describeRules({ max_orders: 0 }, "NGN"), ["Has never bought"]);
    assert.deepEqual(describeRules({ min_orders: 1, max_orders: 1, joined_within_days: 1, has_account: true }, "NGN"), ["Placed 1 to 1 paid order", "Joined in the last 1 day", "Has an account"]);
  });
});

describe("PRESETS", () => {
  it("only use rules the API accepts and each has at least one", () => {
    const allowed = new Set(["min_orders", "max_orders", "min_spent", "max_spent", "ordered_within_days", "inactive_for_days", "joined_within_days", "has_account"]);

    for (const p of PRESETS) {
      assert.ok(hasAnyRule(p.rules), p.name);
      for (const key of Object.keys(p.rules)) assert.ok(allowed.has(key), `${p.name}: ${key}`);
    }
  });
});
