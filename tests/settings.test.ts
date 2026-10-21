import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { settingsSchema } from "../lib/admin/schemas.ts";

const valid = {
  contact: { email: "", phone: "", address: "" },
  seo: { title: "", description: "", og_image: "" },
  checkout: { allow_guest_checkout: true, require_phone: false, shipping_flat_rate: 0 },
  reviews: { enabled: true, require_approval: false },
  inventory: { low_stock_notice: 5 },
  whatsapp: { enabled: false, number: "", message: "" },
  notifications: {
    customer_order_confirmation: true,
    customer_order_updates: true,
    customer_payment_receipt: true,
    customer_refund: true,
    merchant_new_order: true,
    merchant_payment_failed: true,
    merchant_low_stock: true,
    merchant_new_review: true,
    merchant_review_digest: false,
    merchant_campaign_failure: true,
    campaign_tracking: true,
    low_stock_threshold: 5,
    merchant_email: "",
    abandoned_cart_reminder: false,
    abandoned_cart_delay_hours: 4,
    abandoned_cart_second_reminder: false,
    abandoned_cart_second_delay_hours: 24,
    abandoned_cart_discount_percent: 10,
    review_request: false,
    review_request_delay_days: 3,
  },
};

describe("settingsSchema notifications", () => {
  it("accepts the defaults, an empty or valid alert email, and a zero threshold", () => {
    assert.equal(settingsSchema.safeParse(valid).success, true);
    assert.equal(settingsSchema.safeParse({ ...valid, notifications: { ...valid.notifications, merchant_email: "owner@shop.com", low_stock_threshold: 0 } }).success, true);
  });

  it("rejects a bad alert email and an unusable threshold", () => {
    const bad = (patch: object) => settingsSchema.safeParse({ ...valid, notifications: { ...valid.notifications, ...patch } });

    assert.equal(bad({ merchant_email: "nope" }).success, false);
    assert.equal(bad({ low_stock_threshold: -1 }).success, false);
    assert.equal(bad({ low_stock_threshold: 2.5 }).success, false);
    assert.equal(bad({ low_stock_threshold: Number.NaN }).success, false);
  });
});

describe("settingsSchema whatsapp", () => {
  const withWhatsapp = (whatsapp: object) => settingsSchema.safeParse({ ...valid, whatsapp });

  it("lets the button stay off without a number", () => {
    assert.equal(withWhatsapp({ enabled: false, number: "", message: "" }).success, true);
  });

  it("accepts a formatted number once enabled", () => {
    assert.equal(withWhatsapp({ enabled: true, number: "+234 801-234 5678", message: "Hi" }).success, true);
  });

  it("requires a plausible number to enable it", () => {
    assert.equal(withWhatsapp({ enabled: true, number: "", message: "" }).success, false);
    assert.equal(withWhatsapp({ enabled: true, number: "12345", message: "" }).success, false);
    assert.equal(withWhatsapp({ enabled: true, number: "call me", message: "" }).success, false);
  });
});

describe("settingsSchema follow-up reminder", () => {
  const withFollowUp = (patch: object) => settingsSchema.safeParse({ ...valid, notifications: { ...valid.notifications, ...patch } });

  it("accepts a sensible follow-up, including a 0% (no code) one", () => {
    assert.equal(withFollowUp({ abandoned_cart_second_reminder: true, abandoned_cart_discount_percent: 15 }).success, true);
    assert.equal(withFollowUp({ abandoned_cart_discount_percent: 0 }).success, true);
  });

  it("rejects discounts and delays outside the API's limits", () => {
    assert.equal(withFollowUp({ abandoned_cart_discount_percent: 51 }).success, false);
    assert.equal(withFollowUp({ abandoned_cart_discount_percent: -1 }).success, false);
    assert.equal(withFollowUp({ abandoned_cart_discount_percent: 2.5 }).success, false);
    assert.equal(withFollowUp({ abandoned_cart_discount_percent: Number.NaN }).success, false);
    assert.equal(withFollowUp({ abandoned_cart_second_delay_hours: 0 }).success, false);
    assert.equal(withFollowUp({ abandoned_cart_second_delay_hours: 169 }).success, false);
  });
});

describe("settingsSchema review request", () => {
  const withRequest = (patch: object) => settingsSchema.safeParse({ ...valid, notifications: { ...valid.notifications, ...patch } });

  it("accepts the switch and a sensible delay", () => {
    assert.equal(withRequest({ review_request: true, review_request_delay_days: 7 }).success, true);
  });

  it("rejects delays outside the API's limits", () => {
    assert.equal(withRequest({ review_request_delay_days: 0 }).success, false);
    assert.equal(withRequest({ review_request_delay_days: 31 }).success, false);
    assert.equal(withRequest({ review_request_delay_days: 2.5 }).success, false);
    assert.equal(withRequest({ review_request_delay_days: Number.NaN }).success, false);
  });
});

describe("settingsSchema stock note level", () => {
  it("accepts 0 (off) up to 100 and rejects anything else", () => {
    for (const ok of [0, 5, 100]) assert.equal(settingsSchema.safeParse({ ...valid, inventory: { low_stock_notice: ok } }).success, true, String(ok));
    for (const bad of [-1, 101, 2.5, Number.NaN]) assert.equal(settingsSchema.safeParse({ ...valid, inventory: { low_stock_notice: bad } }).success, false, String(bad));
  });
});
