import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSameOrigin, isUploadRequest, maxBodyBytes, requiresJsonBody, resolveUpstreamPath } from "../lib/bff.ts";
import { normalizeHost } from "../lib/host.ts";

describe("photo uploads through the BFF", () => {
  it("recognises only the review photo upload as a file upload", () => {
    assert.equal(isUploadRequest("POST", "review-photos"), true);
    for (const [m, p] of [["GET", "review-photos"], ["DELETE", "review-photos"], ["POST", "newsletter"], ["POST", "review-photos/x"]]) assert.equal(isUploadRequest(m, p), false, `${m} ${p}`);
  });

  it("lets uploads be larger than JSON bodies, and nothing else", () => {
    assert.equal(maxBodyBytes("POST", "review-photos"), 6_000_000);
    assert.equal(maxBodyBytes("POST", "checkout"), 200_000);
  });

  it("allows the photo endpoints and nothing near them", () => {
    assert.equal(resolveUpstreamPath("POST", ["review-photos"]), "review-photos");
    assert.equal(resolveUpstreamPath("DELETE", ["review-photos", "p1"]), "review-photos/p1");
    assert.equal(resolveUpstreamPath("GET", ["review-photos"]), null);
    assert.equal(resolveUpstreamPath("PUT", ["review-photos", "p1"]), null);
  });
});

describe("requiresJsonBody", () => {
  it("expects JSON for writes that carry a body but not for DELETE", () => {
    for (const m of ["POST", "PUT", "PATCH"]) assert.equal(requiresJsonBody(m), true, m);
    for (const m of ["DELETE", "GET"]) assert.equal(requiresJsonBody(m), false, m);
  });
});

describe("BFF allowlist", () => {
  it("allows the storefront endpoints the UI needs", () => {
    const ok: [string, string[]][] = [
      ["POST", ["cart"]],
      ["GET", ["cart", "9b1c"]],
      ["PUT", ["cart", "9b1c", "contact"]],
      ["GET", ["account", "orders", "o1", "invoice"]],
      ["GET", ["products", "pistachio", "reviews"]],
      ["POST", ["products", "pistachio", "reviews"]],
      ["GET", ["products", "pistachio", "reviews", "mine"]],
      ["DELETE", ["products", "pistachio", "reviews", "mine"]],
      ["POST", ["cart", "9b1c", "items"]],
      ["PATCH", ["cart", "9b1c", "items", "i1"]],
      ["DELETE", ["cart", "9b1c", "items", "i1"]],
      ["POST", ["checkout"]],
      ["POST", ["payments", "initialize"]],
      ["GET", ["payments", "pay_abc", "verify"]],
      ["POST", ["auth", "login"]],
      ["POST", ["auth", "forgot-password"]],
      ["POST", ["auth", "reset-password"]],
      ["GET", ["auth", "me"]],
      ["GET", ["account", "orders"]],
      ["POST", ["newsletter"]],
      ["POST", ["cart", "c1", "discount"]],
      ["GET", ["account", "wishlist"]],
      ["PUT", ["account", "wishlist", "abc"]],
      ["DELETE", ["account", "wishlist", "abc"]],
      ["POST", ["products", "pistachio", "stock-alerts"]],
    ];
    for (const [method, segments] of ok) assert.equal(resolveUpstreamPath(method, segments), segments.join("/"), `${method} ${segments.join("/")}`);
  });

  it("refuses wrong methods and anything not on the list", () => {
    const refused: [string, string[]][] = [
      ["GET", ["checkout"]],
      ["DELETE", ["cart"]],
      ["POST", ["auth", "me"]],
      ["GET", ["store"]],
      ["GET", ["admin", "tenants"]],
      ["POST", ["webhooks", "paystack", "x"]],
      ["PUT", ["cart", "1", "items", "2"]],
      ["GET", []],
    ];
    for (const [method, segments] of refused) assert.equal(resolveUpstreamPath(method, segments), null, `${method} ${segments.join("/")}`);
  });

  it("refuses traversal and odd path segments", () => {
    for (const segments of [["cart", "..", "x"], ["cart", ".", "items"], ["cart", "a b"], ["cart", "a%2Fb"], ["cart", "a?b=1"], ["cart", "a/b"]]) {
      assert.equal(resolveUpstreamPath("GET", segments), null, segments.join("|"));
    }
  });
});

describe("same-origin check", () => {
  it("accepts matching or absent Origin and rejects others", () => {
    assert.equal(isSameOrigin(null, "icecream.mydomain.com", normalizeHost), true);
    assert.equal(isSameOrigin("https://icecream.mydomain.com", "icecream.mydomain.com", normalizeHost), true);
    assert.equal(isSameOrigin("http://icecream.localhost:3000", "icecream.localhost", normalizeHost), true);
    assert.equal(isSameOrigin("https://evil.com", "icecream.mydomain.com", normalizeHost), false);
    assert.equal(isSameOrigin("https://fashion.mydomain.com", "icecream.mydomain.com", normalizeHost), false);
    assert.equal(isSameOrigin("not a url", "icecream.mydomain.com", normalizeHost), false);
  });
});
