import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isForwardableContentType, isStrictSameOrigin, PUBLIC_PATHS, resolveAdminPath } from "../lib/admin-bff.ts";
import { normalizeHost } from "../lib/host.ts";
import { fromMinor, toMinor } from "../lib/money.ts";

describe("admin BFF allowlist", () => {
  it("allows the merchant endpoints the dashboard uses", () => {
    const ok: [string, string[]][] = [
      ["POST", ["auth", "login"]], ["GET", ["auth", "me"]], ["POST", ["auth", "email", "resend"]],
      ["GET", ["dashboard", "stats"]], ["PUT", ["store"]], ["PUT", ["store", "theme"]], ["POST", ["store", "logo"]], ["DELETE", ["store", "favicon"]],
      ["GET", ["products"]], ["POST", ["products"]], ["PUT", ["products", "u1"]], ["DELETE", ["products", "u1"]], ["POST", ["products", "u1", "inventory"]],
      ["POST", ["media"]], ["POST", ["media", "m1", "replace"]], ["GET", ["orders", "o1", "invoice"]], ["POST", ["orders", "o1", "void"]], ["POST", ["pos", "sales"]], ["GET", ["campaign-series"]], ["POST", ["campaign-series"]], ["PATCH", ["campaign-series", "s1"]], ["DELETE", ["campaign-series", "s1"]], ["GET", ["reviews"]], ["PATCH", ["reviews", "r1"]], ["DELETE", ["reviews", "r1"]], ["DELETE", ["reviews", "r1", "photos", "p1"]], ["GET", ["email-campaigns"]], ["POST", ["email-campaigns"]], ["POST", ["email-campaigns", "audience"]], ["POST", ["email-campaigns", "test"]], ["GET", ["email-campaigns", "c1"]], ["GET", ["email-campaigns", "c1", "recipients"]], ["GET", ["email-campaigns", "c1", "export"]], ["PATCH", ["email-campaigns", "c1"]], ["POST", ["email-campaigns", "c1", "cancel"]], ["GET", ["customer-segments"]], ["POST", ["customer-segments", "preview"]], ["PUT", ["customer-segments", "s1"]], ["GET", ["customer-segments", "s1", "export"]], ["GET", ["customer-segments", "s1", "customers"]], ["POST", ["store", "settings", "test-email"]], ["GET", ["pos", "shift"]], ["POST", ["pos", "shifts"]], ["POST", ["pos", "shifts", "s1", "close"]], ["GET", ["pos", "reports", "cashiers"]], ["PATCH", ["orders", "o1", "status"]], ["POST", ["orders", "o1", "refund"]],
      ["POST", ["domains", "d1", "verify"]], ["PUT", ["payment-gateways", "paystack"]], ["GET", ["customers"]], ["GET", ["pages"]], ["POST", ["pages"]], ["PUT", ["pages", "p1"]], ["DELETE", ["pages", "p1"]],
      ["GET", ["billing"]], ["POST", ["billing", "checkout"]], ["POST", ["billing", "verify"]], ["POST", ["billing", "cancel"]], ["POST", ["billing", "resume"]],
    ];
    for (const [method, segments] of ok) assert.equal(resolveAdminPath(method, segments), segments.join("/"), `${method} ${segments.join("/")}`);
  });

  it("allows the platform console endpoints", () => {
    const ok: [string, string[]][] = [
      ["GET", ["admin", "overview"]], ["GET", ["admin", "audit-logs"]], ["GET", ["admin", "audit-logs", "export"]], ["GET", ["admin", "audit-logs", "actions"]], ["GET", ["admin", "audit-logs", "a1"]], ["GET", ["admin", "tenants"]], ["POST", ["admin", "tenants", "t1", "suspend"]], ["POST", ["admin", "tenants", "t1", "subscription"]],
      ["PATCH", ["admin", "stores", "s1"]], ["POST", ["admin", "users", "u1", "revoke-tokens"]], ["POST", ["admin", "users", "u1", "verify-email"]], ["PUT", ["admin", "themes", "t1"]], ["DELETE", ["admin", "plans", "p1"]],
      ["PATCH", ["admin", "subscriptions", "s1"]], ["POST", ["admin", "domains", "d1", "verify"]], ["PUT", ["admin", "settings"]],
    ];
    for (const [method, segments] of ok) assert.equal(resolveAdminPath(method, segments), segments.join("/"), `${method} ${segments.join("/")}`);
  });

  it("refuses unsupported admin operations (no tenant/user creation or deletion, no hand-verifying domains)", () => {
    const refused: [string, string[]][] = [
      ["POST", ["admin", "audit-logs"]], ["DELETE", ["admin", "audit-logs", "a1"]], ["PATCH", ["admin", "audit-logs", "a1"]],
      ["POST", ["admin", "tenants"]], ["DELETE", ["admin", "tenants", "t1"]], ["DELETE", ["admin", "users", "u1"]], ["POST", ["admin", "users"]],
      ["POST", ["admin", "domains", "d1", "force-verify"]], ["GET", ["admin", "users", "u1", "verify-email"]], ["PUT", ["admin", "plans"]], ["GET", ["admin", "unknown"]],
    ];
    for (const [method, segments] of refused) assert.equal(resolveAdminPath(method, segments), null, `${method} ${segments.join("/")}`);
  });

  it("refuses webhook, storefront and unknown endpoints", () => {
    const refused: [string, string[]][] = [
      ["POST", ["webhooks", "paystack", "t"]],
      ["GET", ["storefront", "store"]], ["POST", ["payment-gateways", "stripe"]], ["PUT", ["payment-gateways", "stripe"]],
      ["DELETE", ["orders", "o1"]], ["PUT", ["orders", "o1", "status"]], ["POST", ["billing"]], ["GET", ["billing", "checkout"]], ["PUT", ["billing", "cancel"]], ["POST", ["webhooks", "billing", "paystack"]], ["GET", ["orders", "o1", "refund"]], ["POST", ["customers"]], ["GET", []],
    ];
    for (const [method, segments] of refused) assert.equal(resolveAdminPath(method, segments), null, `${method} ${segments.join("/")}`);
  });

  it("refuses traversal and odd segments", () => {
    for (const segments of [["products", ".."], ["products", "a b"], ["products", "a%2Fb"], ["products", "a?x=1"], ["..", "admin", "tenants"]]) {
      assert.equal(resolveAdminPath("GET", segments), null, segments.join("|"));
    }
  });

  it("limits unauthenticated access to the auth entry points", () => {
    assert.deepEqual([...PUBLIC_PATHS].sort(), ["auth/forgot-password", "auth/login", "auth/register", "auth/reset-password"]);
  });
});

describe("admin BFF request checks", () => {
  it("requires a matching Origin on writes (absent Origin is rejected)", () => {
    assert.equal(isStrictSameOrigin(null, "app.mydomain.com", normalizeHost), false);
    assert.equal(isStrictSameOrigin("https://app.mydomain.com", "app.mydomain.com", normalizeHost), true);
    assert.equal(isStrictSameOrigin("https://icecream.mydomain.com", "app.mydomain.com", normalizeHost), false);
    assert.equal(isStrictSameOrigin("https://evil.com", "app.mydomain.com", normalizeHost), false);
  });

  it("forwards only JSON and multipart bodies", () => {
    assert.equal(isForwardableContentType("application/json"), true);
    assert.equal(isForwardableContentType("application/json; charset=utf-8"), true);
    assert.equal(isForwardableContentType("multipart/form-data; boundary=x"), true);
    assert.equal(isForwardableContentType("text/plain"), false);
    assert.equal(isForwardableContentType("application/x-www-form-urlencoded"), false);
    assert.equal(isForwardableContentType(null), false);
  });
});

describe("money input", () => {
  it("parses merchant-typed amounts into minor units", () => {
    assert.equal(toMinor("1500"), 150000);
    assert.equal(toMinor("1,500.50"), 150050);
    assert.equal(toMinor(" 12.5 "), 1250);
    assert.equal(toMinor("0.05"), 5);
    assert.equal(toMinor("0"), 0);
  });

  it("rejects negatives, 3 decimals, letters and empty input", () => {
    for (const bad of ["-5", "1.234", "abc", "", "1e3", "1,5,0.00x", ".5", "12.", "9".repeat(20)]) assert.equal(toMinor(bad), null, bad);
  });

  it("formats minor units for editing", () => {
    assert.equal(fromMinor(150050), "1500.50");
    assert.equal(fromMinor(5), "0.05");
    assert.equal(fromMinor(null), "");
  });
});

import { formatAddress, nextStatuses, refundableAmount } from "../lib/admin/orders.ts";
import { emptyProductForm, formToPayload, serverKeyToProductField, validateProductForm } from "../lib/admin/product-form.ts";
import { discountSchema, domainSchema, gatewaySchema, settingsSchema, stockAdjustSchema } from "../lib/admin/schemas.ts";

describe("order helpers", () => {
  it("mirrors the order state machine", () => {
    assert.deepEqual(nextStatuses("PENDING"), ["PROCESSING", "CANCELLED"]);
    assert.deepEqual(nextStatuses("SHIPPED"), ["DELIVERED"]);
    assert.deepEqual(nextStatuses("CANCELLED"), []);
    assert.deepEqual(nextStatuses("COMPLETED"), []);
    assert.deepEqual(nextStatuses("UNKNOWN"), []);
  });

  it("computes the refundable remainder from the paid payment only", () => {
    assert.equal(refundableAmount([{ status: "PAID", amount: 300000, refundedAmount: 100000 }]), 200000);
    assert.equal(refundableAmount([{ status: "PARTIALLY_REFUNDED", amount: 300000, refundedAmount: 300000 }]), 0);
    assert.equal(refundableAmount([{ status: "PENDING", amount: 300000, refundedAmount: 0 }, { status: "FAILED", amount: 1, refundedAmount: 0 }]), 0);
    assert.equal(refundableAmount(undefined), 0);
  });

  it("formats addresses without blanks", () => {
    assert.deepEqual(formatAddress({ first_name: "Ada", last_name: "Obi", line1: "1 Marina", line2: null, city: "Lagos", state: null, postal_code: "100001", country: "NG", phone: null }), ["Ada Obi", "1 Marina", "Lagos, 100001", "NG"]);
  });
});

describe("product form", () => {
  const valid = { ...emptyProductForm(), name: "Shirt", price: 150000 };

  it("accepts a minimal product and rejects missing name/price", () => {
    assert.deepEqual(validateProductForm(valid), {});
    const errors = validateProductForm({ ...valid, name: " ", price: null });
    assert.ok(errors.name && errors.price);
  });

  it("validates compare-at price, slug and variants", () => {
    assert.ok(validateProductForm({ ...valid, compareAtPrice: 100 }).compareAtPrice);
    assert.ok(validateProductForm({ ...valid, slug: "Bad Slug" }).slug);
    assert.ok(validateProductForm({ ...valid, variants: [{ values: ["S"], sku: "", price: null, stock: 1 }] }).optionNames, "variants need option names");
    const dup = validateProductForm({ ...valid, optionNames: ["Size"], variants: [{ values: ["S"], sku: "", price: null, stock: 1 }, { values: ["s"], sku: "", price: null, stock: 1 }] });
    assert.ok(dup["variants.1.values"]);
    assert.ok(validateProductForm({ ...valid, optionNames: ["Size"], variants: [{ values: [""], sku: "", price: null, stock: 1 }] })["variants.0.values.0"]);
  });

  it("builds the API payload: minor-unit integers, nulls for blanks, options object", () => {
    const payload = formToPayload({ ...valid, sku: " ", slug: "", categoryId: "", optionNames: ["Size", "Color"], variants: [{ id: "v1", values: ["L", "Red"], sku: "", price: null, stock: 4 }, { values: ["S", "Blue"], sku: "S-B", price: 120000, stock: 2 }], stock: 9 });

    assert.equal(payload.price, 150000);
    assert.equal(payload.sku, null);
    assert.equal(payload.category_id, null);
    assert.ok(!("slug" in payload));
    assert.equal(payload.stock, 0, "stock is per-variant when variants exist");
    assert.deepEqual(payload.variants[0], { id: "v1", options: { Size: "L", Color: "Red" }, sku: null, price: null, stock: 4 });
    assert.deepEqual(payload.variants[1].options, { Size: "S", Color: "Blue" });
    assert.ok(!("id" in payload.variants[1]));
  });

  it("maps server field names onto form fields", () => {
    assert.equal(serverKeyToProductField("compare_at_price"), "compareAtPrice");
    assert.equal(serverKeyToProductField("category_id"), "categoryId");
    assert.equal(serverKeyToProductField("variants.2.options"), "variants.2.values");
    assert.equal(serverKeyToProductField("variants.0.sku"), "variants.0.sku");
  });
});

describe("dashboard schemas", () => {
  it("validates discounts", () => {
    const base = { code: "save10", type: "percentage" as const, value: 10, minSubtotal: 0, maxUses: null, startsAt: null, endsAt: null, isActive: true };
    const ok = discountSchema.safeParse(base);
    assert.ok(ok.success && ok.data.code === "SAVE10");
    assert.equal(discountSchema.safeParse({ ...base, value: 150 }).success, false);
    assert.equal(discountSchema.safeParse({ ...base, type: "fixed" as const, value: 150 }).success, true);
    assert.equal(discountSchema.safeParse({ ...base, code: "bad code!" }).success, false);
    assert.equal(discountSchema.safeParse({ ...base, startsAt: "2026-02-02T10:00", endsAt: "2026-01-01T10:00" }).success, false);
  });

  it("validates domains", () => {
    for (const good of ["shop.example.com", "HTTPS://www.Example.co.uk/", "example.com"]) assert.ok(domainSchema.safeParse({ domain: good }).success, good);
    for (const bad of ["localhost", "not a domain", "http://", "-bad.com", "a.b", "192.168.0.1"]) assert.equal(domainSchema.safeParse({ domain: bad }).success, false, bad);
  });

  it("validates stock adjustments", () => {
    assert.ok(stockAdjustSchema.safeParse({ delta: 5, reason: "restock" }).success);
    assert.ok(stockAdjustSchema.safeParse({ delta: -3, reason: "manual_adjustment" }).success);
    for (const bad of [{ delta: 0, reason: "restock" }, { delta: Number.NaN, reason: "restock" }, { delta: 5, reason: "order_placed" }, { delta: 2_000_000, reason: "restock" }]) assert.equal(stockAdjustSchema.safeParse(bad).success, false);
  });

  it("validates gateway credentials per provider", () => {
    assert.ok(gatewaySchema("paystack", false).safeParse({ secret_key: "sk_test_abc123", public_key: "", webhook_secret: "" }).success);
    assert.equal(gatewaySchema("paystack", false).safeParse({ secret_key: "nope", public_key: "", webhook_secret: "" }).success, false);
    assert.equal(gatewaySchema("paystack", false).safeParse({ secret_key: "", public_key: "", webhook_secret: "" }).success, false);
    assert.ok(gatewaySchema("paystack", true).safeParse({ secret_key: "", public_key: "", webhook_secret: "" }).success, "existing gateway: secret optional");
    assert.equal(gatewaySchema("flutterwave", false).safeParse({ secret_key: "FLWSECK_TEST-abc", public_key: "", webhook_secret: "short" }).success, false);
    assert.ok(gatewaySchema("flutterwave", false).safeParse({ secret_key: "FLWSECK_TEST-abc", public_key: "", webhook_secret: "long-enough-hash" }).success);
  });

  it("validates settings URLs and email", () => {
    const base = { contact: { email: "", phone: "", address: "" }, seo: { title: "", description: "", og_image: "" }, checkout: { allow_guest_checkout: true, require_phone: false, shipping_flat_rate: 0 }, reviews: { enabled: true, require_approval: false }, inventory: { low_stock_notice: 5 }, whatsapp: { enabled: false, number: "", message: "" }, notifications: { customer_order_confirmation: true, customer_order_updates: true, customer_payment_receipt: true, customer_refund: true, merchant_new_order: true, merchant_payment_failed: true, merchant_low_stock: true, merchant_new_review: true, merchant_review_digest: false, merchant_campaign_failure: true, campaign_tracking: true, low_stock_threshold: 5, merchant_email: "", abandoned_cart_reminder: false, abandoned_cart_delay_hours: 4, abandoned_cart_second_reminder: false, abandoned_cart_second_delay_hours: 24, abandoned_cart_discount_percent: 10, review_request: false, review_request_delay_days: 3 } };
    assert.ok(settingsSchema.safeParse(base).success);
    assert.equal(settingsSchema.safeParse({ ...base, seo: { ...base.seo, og_image: "javascript:alert(1)" } }).success, false);
    assert.equal(settingsSchema.safeParse({ ...base, seo: { ...base.seo, og_image: "http://insecure.test/a.png" } }).success, false);
    assert.equal(settingsSchema.safeParse({ ...base, contact: { ...base.contact, email: "nope" } }).success, false);
  });
});

import { variantValuesError } from "../lib/admin/product-form.ts";

describe("variant error lookup", () => {
  it("finds both row-level and cell-level value errors", () => {
    assert.equal(variantValuesError({ "variants.1.values": "Duplicate variant" }, 1), "Duplicate variant");
    assert.equal(variantValuesError({ "variants.0.values.1": "Required" }, 0), "Required");
    assert.equal(variantValuesError({ "variants.10.values": "x" }, 1), undefined);
  });
});

import { buildThemePayload, isHex, isPathOrHttps, moveItem, validateConfiguration } from "../lib/admin/theme.ts";
import type { ThemeConfiguration } from "../lib/types.ts";

const baseConfig = (): ThemeConfiguration => ({
  colors: { primary: "#111827", secondary: "#6b7280", accent: "#f59e0b", background: "#ffffff", text: "#111827" },
  fonts: { heading: "Inter", body: "Inter" },
  hero: { title: "Hi", subtitle: "", image_url: null, cta_label: "Shop", cta_url: "/products" },
  navigation: [{ label: "Home", url: "/" }],
  footer: { text: null, links: [] },
  social: { instagram: "https://instagram.com/x", facebook: "" },
  homepage: { sections: [{ type: "hero", enabled: true, config: {} }, { type: "featured_products", enabled: true, config: { limit: 8, title: " " } }, { type: "testimonials", enabled: false, config: { items: [{ quote: " Great ", author: " Ada " }] } }] },
});

describe("theme editor helpers", () => {
  it("validates colours and URLs like the API", () => {
    assert.equal(isHex("#a1B2c3"), true);
    for (const bad of ["red", "#fff", "#12345g", "a1b2c3"]) assert.equal(isHex(bad), false, bad);
    for (const ok of ["/", "/products?x=1", "https://shop.example.com/a"]) assert.equal(isPathOrHttps(ok), true, ok);
    for (const bad of ["//evil.com", "javascript:alert(1)", "http://insecure.test", "data:text/html,x", "products", "/a b"]) assert.equal(isPathOrHttps(bad), false, bad);
  });

  it("reports configuration errors with API-style keys", () => {
    assert.deepEqual(validateConfiguration(baseConfig()), {});

    const bad = baseConfig();
    bad.colors.primary = "red";
    bad.hero.cta_url = "javascript:alert(1)";
    bad.navigation = [{ label: " ", url: "//evil.com" }];
    bad.social.facebook = "http://fb.test";
    bad.homepage.sections[1].config.limit = 99;
    bad.homepage.sections[2].config.items = [{ quote: "", author: "" }];

    const errors = validateConfiguration(bad);
    for (const key of ["configuration.colors.primary", "configuration.hero.cta_url", "configuration.navigation.0.label", "configuration.navigation.0.url", "configuration.social.facebook", "configuration.homepage.sections.1.config.limit", "configuration.homepage.sections.2.config.items.0.quote", "configuration.homepage.sections.2.config.items.0.author"]) {
      assert.ok(errors[key], key);
    }
  });

  it("reorders without mutating and ignores out-of-range moves", () => {
    const list = ["a", "b", "c"];
    assert.deepEqual(moveItem(list, 1, -1), ["b", "a", "c"]);
    assert.deepEqual(moveItem(list, 1, 1), ["a", "c", "b"]);
    assert.deepEqual(moveItem(list, 0, -1), ["a", "b", "c"]);
    assert.deepEqual(moveItem(list, 2, 1), ["a", "b", "c"]);
    assert.deepEqual(list, ["a", "b", "c"]);
  });

  it("builds a clean payload: blanks become null, only API-accepted config keys are sent", () => {
    const payload = buildThemePayload("theme-1", baseConfig());
    const c = payload.configuration;

    assert.equal(payload.theme_id, "theme-1");
    assert.equal(c.hero.subtitle, null);
    assert.equal(c.social.facebook, null);
    assert.equal(c.social.instagram, "https://instagram.com/x");
    assert.deepEqual(c.homepage.sections[0].config, {});
    assert.deepEqual(c.homepage.sections[1].config, { limit: 8 }, "blank title omitted");
    assert.deepEqual(c.homepage.sections[2].config, { items: [{ quote: "Great", author: "Ada" }] });
    assert.ok(!("theme_id" in buildThemePayload(null, baseConfig())));
  });
});

import { affectsStorefront, storefrontTags } from "../lib/admin-bff.ts";

describe("storefront cache invalidation", () => {
  it("revalidates after storefront-affecting writes only", () => {
    assert.equal(affectsStorefront("PUT", "store/theme"), true);
    assert.equal(affectsStorefront("POST", "products"), true);
    assert.equal(affectsStorefront("PATCH", "orders/o1/status"), true);
    assert.equal(affectsStorefront("GET", "products"), false);
    assert.equal(affectsStorefront("POST", "auth/login"), false);
    assert.equal(affectsStorefront("PUT", "payment-gateways/paystack"), false);
    assert.equal(affectsStorefront("POST", "admin/tenants/t1/suspend"), false, "admin writes purge caches from the response instead");
  });

  it("tags every verified hostname (and its www/apex twin), never unverified ones", () => {
    const tags = storefrontTags([
      { domain: "icecream.mydomain.com", isVerified: true },
      { domain: "www.icecream.com", isVerified: true },
      { domain: "pending.com", isVerified: false },
    ]);

    assert.deepEqual(tags.sort(), ["tenant:icecream.com", "tenant:icecream.mydomain.com", "tenant:www.icecream.com"]);
    assert.deepEqual(storefrontTags([]), []);
  });
});

import { adminResponseTags } from "../lib/admin-bff.ts";

describe("admin response cache tags", () => {
  it("purges the hostnames returned with a suspended/activated tenant", () => {
    const tags = adminResponseTags({ data: { domains: [{ domain: "icecream.mydomain.com", isVerified: true }, { domain: "x.test", isVerified: false }] } });
    assert.deepEqual(tags, ["tenant:icecream.mydomain.com"]);
    assert.deepEqual(adminResponseTags({ data: {} }), []);
    assert.deepEqual(adminResponseTags(null), []);
    assert.deepEqual(adminResponseTags({ data: { domains: "nope" } }), []);
  });
});
