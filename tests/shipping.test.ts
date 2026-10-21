import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeCoverage, draftToPayload, emptyZoneDraft, newRateDraft, validateDraft, zoneToDraft, type ShippingZone } from "../lib/admin/shipping.ts";

const zone = (patch: Partial<ShippingZone> = {}): ShippingZone => ({
  id: "z1", name: "Lagos", countries: ["NG"], states: ["Lagos"], isActive: true, position: 0,
  rates: [{ id: "r1", name: "Same-day", description: "Before 12pm", price: 300000, freeOver: 5000000, isActive: true, position: 0 }],
  ...patch,
});

describe("zone drafts", () => {
  it("round-trips a zone through the editor without changing it", () => {
    const payload = draftToPayload(zoneToDraft(zone()));

    assert.deepEqual(payload, { name: "Lagos", countries: ["NG"], states: ["Lagos"], is_active: true, rates: [{ id: "r1", name: "Same-day", description: "Before 12pm", price: 300000, free_over: 5000000, is_active: true }] });
  });

  it("recognises the three kinds of coverage", () => {
    assert.equal(zoneToDraft(zone()).mode, "states");
    assert.equal(zoneToDraft(zone({ states: [], countries: ["GH", "KE"] })).mode, "countries");
    assert.equal(zoneToDraft(zone({ states: [], countries: ["*"] })).mode, "everywhere");
  });

  it("sends the right countries and states for each kind of coverage", () => {
    const base = zoneToDraft(zone());

    assert.deepEqual([draftToPayload({ ...base, mode: "states", states: ["Kano"] }).countries, draftToPayload({ ...base, mode: "states", states: ["Kano"] }).states], [["NG"], ["Kano"]]);
    assert.deepEqual([draftToPayload({ ...base, mode: "everywhere" }).countries, draftToPayload({ ...base, mode: "everywhere" }).states], [["*"], []]);
    assert.deepEqual([draftToPayload({ ...base, mode: "countries", countries: ["GH"] }).countries, draftToPayload({ ...base, mode: "countries", countries: ["GH"] }).states], [["GH"], []]);
  });

  it("only sends ids for methods that already exist, and turns a blank description into null", () => {
    const draft = { ...emptyZoneDraft(), name: "X", states: ["Lagos"], rates: [newRateDraft({ name: "New", price: 100, description: "  " }), ...zoneToDraft(zone()).rates] };
    const { rates } = draftToPayload(draft);

    assert.equal("id" in rates[0], false);
    assert.equal(rates[0].description, null);
    assert.equal(rates[1].id, "r1");
  });
});

describe("validateDraft", () => {
  it("accepts a complete zone", () => {
    assert.deepEqual(validateDraft(zoneToDraft(zone())), {});
  });

  it("asks for the missing pieces, with keys that match the API's", () => {
    const blank = { ...emptyZoneDraft(), rates: [newRateDraft({ freeOver: 0 })] };

    assert.deepEqual(Object.keys(validateDraft(blank)).sort(), ["name", "rates.0.free_over", "rates.0.name", "rates.0.price", "states"]);
    assert.equal(validateDraft({ ...zoneToDraft(zone()), rates: [] }).rates, "Add at least one delivery method");
    assert.ok(validateDraft({ ...zoneToDraft(zone()), mode: "countries", countries: [] }).countries);
  });

  it("allows a free method and an empty free-over", () => {
    const draft = zoneToDraft(zone({ rates: [{ id: "r", name: "Free", description: null, price: 0, freeOver: null, isActive: true, position: 0 }] }));
    assert.deepEqual(validateDraft(draft), {});
  });
});

describe("describeCoverage", () => {
  it("reads naturally for each kind of zone", () => {
    assert.equal(describeCoverage(zone({ states: ["Lagos", "Ogun"] })), "Nigeria: Lagos, Ogun");
    assert.equal(describeCoverage(zone({ states: [], countries: ["GH", "KE"] }), { GH: "Ghana", KE: "Kenya" }), "Ghana, Kenya");
    assert.equal(describeCoverage(zone({ states: [], countries: ["*"] })), "Everywhere else");
    assert.equal(describeCoverage(zone({ states: [], countries: ["ZZ"] })), "ZZ");
  });
});
