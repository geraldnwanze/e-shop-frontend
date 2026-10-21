import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSafeRedirect, serverKeyToField, toCheckoutPayload, type CheckoutValues } from "../lib/checkout.ts";
import { checkoutSchema, fieldErrors, loginSchema, registerSchema, trackOrderSchema } from "../lib/schemas.ts";
import { jsonLd, truncate } from "../lib/seo.ts";

const address = { firstName: "Ada", lastName: "Obi", line1: "1 Marina", city: "Lagos", country: "ng" };
const valid: CheckoutValues = { email: " Ada@Example.com ", firstName: "Ada", lastName: "Obi", phone: "", shipping: address, billingSameAsShipping: true };

describe("checkout payload", () => {
  it("never carries prices or totals and normalises input", () => {
    const payload = toCheckoutPayload("cart-1", valid);

    assert.deepEqual(Object.keys(payload).sort(), ["billing_address", "cart_id", "customer", "discount_code", "notes", "shipping_address", "shipping_rate_id"]);
    assert.equal(payload.customer.email, "ada@example.com");
    assert.equal(payload.customer.phone, null);
    assert.equal(payload.shipping_address.country, "NG");
    assert.equal(payload.billing_address, null);
  });

  it("sends marketing consent only when the shopper ticked the box", () => {
    assert.equal(toCheckoutPayload("c", valid).customer.accepts_marketing, false);
    assert.equal(toCheckoutPayload("c", { ...valid, acceptsMarketing: true }).customer.accepts_marketing, true);
  });

  it("sends the chosen delivery method as an id only", () => {
    assert.equal(toCheckoutPayload("c", { ...valid, shippingRateId: "rate-1" }).shipping_rate_id, "rate-1");
    assert.equal(toCheckoutPayload("c", valid).shipping_rate_id, null);
  });

  it("sends a distinct billing address only when asked", () => {
    const payload = toCheckoutPayload("c", { ...valid, billingSameAsShipping: false, billing: { ...address, city: "Abuja" } });
    assert.equal(payload.billing_address?.city, "Abuja");
  });

  it("maps Laravel error keys onto form fields", () => {
    assert.equal(serverKeyToField("customer.email"), "email");
    assert.equal(serverKeyToField("customer.first_name"), "firstName");
    assert.equal(serverKeyToField("shipping_address.postal_code"), "shipping.postalCode");
    assert.equal(serverKeyToField("billing_address.line1"), "billing.line1");
    assert.equal(serverKeyToField("discount_code"), "discountCode");
  });

  it("only follows https payment redirects", () => {
    assert.equal(isSafeRedirect("https://checkout.paystack.com/abc"), true);
    for (const bad of ["http://x.com", "javascript:alert(1)", "//evil.com", "/relative", "", null, undefined]) assert.equal(isSafeRedirect(bad), false, String(bad));
  });
});

describe("zod schemas", () => {
  it("accepts a valid checkout and normalises the country", () => {
    const parsed = checkoutSchema(false).safeParse({ ...valid, email: "ada@example.com" });
    assert.equal(parsed.success, true);
    assert.equal(parsed.success && parsed.data.shipping.country, "NG");
  });

  it("reports field errors with dotted paths", () => {
    const parsed = checkoutSchema(true).safeParse({ ...valid, email: "nope", phone: "", shipping: { ...address, city: "", country: "Nigeria" } });
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error);
      assert.ok(errors.email);
      assert.ok(errors.phone, "phone required when the store demands it");
      assert.ok(errors["shipping.city"]);
      assert.ok(errors["shipping.country"]);
    }
  });

  it("requires billing details when it differs from shipping", () => {
    const parsed = checkoutSchema(false).safeParse({ ...valid, email: "a@b.co", billingSameAsShipping: false });
    assert.equal(parsed.success, false);
    assert.ok(!parsed.success && fieldErrors(parsed.error).billing);
  });

  it("validates auth and tracking forms", () => {
    assert.equal(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success, true);
    assert.equal(loginSchema.safeParse({ email: "a@b.co", password: "" }).success, false);
    assert.equal(registerSchema.safeParse({ firstName: "A", lastName: "B", email: "a@b.co", password: "short1", passwordConfirmation: "short1" }).success, false);
    assert.equal(registerSchema.safeParse({ firstName: "A", lastName: "B", email: "a@b.co", password: "longenough1", passwordConfirmation: "different1" }).success, false);
    assert.equal(registerSchema.safeParse({ firstName: "A", lastName: "B", email: "a@b.co", password: "longenough1", passwordConfirmation: "longenough1" }).success, true);
    assert.equal(trackOrderSchema.safeParse({ orderNumber: "ORD-2026-000001" }).success, true);
  });
});

describe("seo helpers", () => {
  it("escapes < in JSON-LD so a product name cannot close the script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    assert.ok(!out.includes("<"));
    assert.deepEqual(JSON.parse(out), { name: "</script><script>alert(1)</script>" });
  });

  it("truncates descriptions on a word boundary", () => {
    assert.equal(truncate(null), undefined);
    assert.equal(truncate("short"), "short");
    const long = truncate("word ".repeat(100), 30)!;
    assert.ok(long.length <= 30 && long.endsWith("…") && !long.includes("  "));
  });
});
