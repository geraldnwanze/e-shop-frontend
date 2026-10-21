import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deliveryStatus, describeAudience, engagementRates, percentOf, resultsExportUrl, formatInZone, scheduleProblem, toCampaignPayload, utcToZonedLocal, validateCampaign, zonedTimeToUtcIso, type CampaignDraft } from "../lib/admin/campaigns.ts";

const good: CampaignDraft = { subject: "Summer offers", body: "Hi {first_name}, new flavours are in.", buttonLabel: "", buttonUrl: "" };

describe("validateCampaign", () => {
  it("accepts a plain message and a message with a complete button", () => {
    assert.deepEqual(validateCampaign(good), {});
    assert.deepEqual(validateCampaign({ ...good, buttonLabel: "Shop now", buttonUrl: "https://shop.example.com/offers" }), {});
  });

  it("asks for a subject and a message", () => {
    const errors = validateCampaign({ ...good, subject: " ", body: "short" });

    assert.ok(errors.subject);
    assert.ok(errors.body);
  });

  it("needs the button text and link together, and the link must be https", () => {
    assert.ok(validateCampaign({ ...good, buttonLabel: "Shop" }).buttonUrl);
    assert.ok(validateCampaign({ ...good, buttonUrl: "https://shop.example.com" }).buttonLabel);
    assert.ok(validateCampaign({ ...good, buttonLabel: "Shop", buttonUrl: "http://shop.example.com" }).buttonUrl);
    assert.ok(validateCampaign({ ...good, buttonLabel: "Shop", buttonUrl: "javascript:alert(1)" }).buttonUrl);
  });

  it("enforces the length limits", () => {
    assert.ok(validateCampaign({ ...good, subject: "x".repeat(151) }).subject);
    assert.ok(validateCampaign({ ...good, body: "x".repeat(5001) }).body);
  });
});

describe("toCampaignPayload", () => {
  it("trims text and turns an empty button into nulls", () => {
    assert.deepEqual(toCampaignPayload("seg-1", { ...good, subject: "  Hi  ", body: " Body text here " }), { segment_id: "seg-1", subject: "Hi", body: "Body text here", button_label: null, button_url: null });
  });
});

describe("describeAudience", () => {
  it("says who will get it and explains who will not", () => {
    assert.deepEqual(describeAudience({ inSegment: 10, notOptedIn: 3, unsubscribed: 1, eligible: 6 }), { headline: "This will go to 6 customers (of 10 in the segment).", notes: ["3 customers have not agreed to receive emails.", "1 unsubscribed."] });
    assert.equal(describeAudience({ inSegment: 1, notOptedIn: 0, unsubscribed: 0, eligible: 1 }).headline, "This will go to 1 customer (of 1 in the segment).");
    assert.equal(describeAudience({ inSegment: 2, notOptedIn: 2, unsubscribed: 0, eligible: 0 }).headline, "Nobody in this segment can be emailed yet.");
    assert.deepEqual(describeAudience({ inSegment: 2, notOptedIn: 1, unsubscribed: 0, eligible: 1 }).notes, ["1 customer has not agreed to receive emails."]);
  });
});

describe("deliveryStatus", () => {
  it("shows progress, completion and failures", () => {
    assert.deepEqual(deliveryStatus({ status: "sending", recipientsCount: 20, sentCount: 8, failedCount: 1 }), { label: "Sending 9/20", tone: "blue" });
    assert.deepEqual(deliveryStatus({ status: "sent", recipientsCount: 20, sentCount: 20, failedCount: 0 }), { label: "Sent", tone: "green" });
    assert.deepEqual(deliveryStatus({ status: "sent", recipientsCount: 20, sentCount: 18, failedCount: 2 }), { label: "Sent, 2 failed", tone: "amber" });
  });
});

describe("store-time scheduling", () => {
  it("converts a wall-clock time in the store's zone to UTC", () => {
    assert.equal(zonedTimeToUtcIso("2026-10-12T08:00", "Africa/Lagos"), "2026-10-12T07:00:00.000Z");
    assert.equal(zonedTimeToUtcIso("2026-10-12T08:00", "UTC"), "2026-10-12T08:00:00.000Z");
    assert.equal(zonedTimeToUtcIso("2026-10-12T08:00", "Asia/Kolkata"), "2026-10-12T02:30:00.000Z");
  });

  it("follows daylight saving", () => {
    assert.equal(zonedTimeToUtcIso("2026-07-01T09:00", "America/New_York"), "2026-07-01T13:00:00.000Z");
    assert.equal(zonedTimeToUtcIso("2026-12-01T09:00", "America/New_York"), "2026-12-01T14:00:00.000Z");
  });

  it("round-trips back to the wall clock", () => {
    for (const zone of ["Africa/Lagos", "America/New_York", "Asia/Kolkata", "UTC"]) {
      assert.equal(utcToZonedLocal(zonedTimeToUtcIso("2026-10-12T08:15", zone) as string, zone), "2026-10-12T08:15", zone);
    }
  });

  it("rejects incomplete or impossible values", () => {
    for (const bad of ["", "2026-10-12", "2026-10-12T8:00", "not a date", "2026-13-01T08:00", "2026-11-31T08:00", "2026-10-12T25:00", "2026-10-12T08:61"]) assert.equal(zonedTimeToUtcIso(bad, "UTC"), null, bad);
  });

  it("shows a time in the store's zone", () => {
    assert.equal(formatInZone("2026-10-12T07:00:00Z", "Africa/Lagos"), "Mon 12 Oct 08:00");
  });

  it("only allows times between five minutes and ninety days ahead", () => {
    const now = new Date("2026-10-12T07:00:00Z");

    assert.equal(scheduleProblem("2026-10-12T08:30", "Africa/Lagos", now), null);
    assert.match(scheduleProblem("2026-10-12T08:02", "Africa/Lagos", now) ?? "", /at least 5 minutes/);
    assert.match(scheduleProblem("2026-10-11T08:00", "Africa/Lagos", now) ?? "", /at least 5 minutes/);
    assert.match(scheduleProblem("2027-03-01T08:00", "Africa/Lagos", now) ?? "", /90 days/);
    assert.match(scheduleProblem("", "Africa/Lagos", now) ?? "", /date and time/);
  });
});

describe("deliveryStatus for scheduled campaigns", () => {
  it("labels scheduled, cancelled and failed campaigns", () => {
    const base = { recipientsCount: 0, sentCount: 0, failedCount: 0 };

    assert.deepEqual(deliveryStatus({ ...base, status: "scheduled" }), { label: "Scheduled", tone: "amber" });
    assert.deepEqual(deliveryStatus({ ...base, status: "cancelled" }), { label: "Cancelled", tone: "neutral" });
    assert.deepEqual(deliveryStatus({ ...base, status: "failed" }), { label: "Could not send", tone: "red" });
  });
});

describe("engagementRates", () => {
  it("works out open, click and click-to-open rates among delivered emails", () => {
    assert.deepEqual(engagementRates({ tracked: true, sentCount: 20, openedCount: 10, clickedCount: 4 }), { openRate: 50, clickRate: 20, clickToOpenRate: 40 });
  });

  it("is null for campaigns that were never measured, so they do not look like 0%", () => {
    assert.equal(engagementRates({ tracked: false, sentCount: 20, openedCount: 0, clickedCount: 0 }), null);
    assert.equal(engagementRates({ sentCount: 20 }), null);
  });

  it("copes with nothing delivered or nobody opening", () => {
    assert.deepEqual(engagementRates({ tracked: true, sentCount: 0, openedCount: 0, clickedCount: 0 }), { openRate: null, clickRate: null, clickToOpenRate: null });
    assert.deepEqual(engagementRates({ tracked: true, sentCount: 5, openedCount: 0, clickedCount: 0 }), { openRate: 0, clickRate: 0, clickToOpenRate: null });
  });
});

describe("percentOf", () => {
  it("rounds and never goes past 100", () => {
    assert.equal(percentOf(1, 3), 33);
    assert.equal(percentOf(2, 3), 67);
    assert.equal(percentOf(7, 5), 100);
    assert.equal(percentOf(1, 0), null);
  });
});

describe("resultsExportUrl", () => {
  it("exports everyone with no query, or just the filter and search being viewed", () => {
    assert.equal(resultsExportUrl("c1"), "/api/admin/email-campaigns/c1/export");
    assert.equal(resultsExportUrl("c1", "clicked"), "/api/admin/email-campaigns/c1/export?status=clicked");
    assert.equal(resultsExportUrl("c1", "all", "  ada "), "/api/admin/email-campaigns/c1/export?search=ada");
    assert.equal(resultsExportUrl("c1", "opened", "a&b=c"), "/api/admin/email-campaigns/c1/export?status=opened&search=a%26b%3Dc");
  });

  it("encodes the campaign id", () => {
    assert.equal(resultsExportUrl("a/b"), "/api/admin/email-campaigns/a%2Fb/export");
  });
});
