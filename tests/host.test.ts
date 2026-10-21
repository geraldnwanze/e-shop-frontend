import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAppHost, isInternalPath, isStaticAsset, normalizeHost, tenantPath } from "../lib/host.ts";

describe("normalizeHost", () => {
  it("lowercases, strips port and trailing dot", () => {
    assert.equal(normalizeHost("IceCream.MyDomain.com:3000"), "icecream.mydomain.com");
    assert.equal(normalizeHost("www.icecream.com."), "www.icecream.com");
  });

  it("rejects anything that is not a plain hostname (path traversal, injection)", () => {
    for (const bad of ["", null, undefined, "evil.com/../../x", "a b.com", "host?x=1", "ho$t.com", "-bad.com", "a".repeat(260) + ".com", "../etc", "x.com\\y"]) {
      assert.equal(normalizeHost(bad as string), "", String(bad));
    }
  });
});

describe("routing helpers", () => {
  it("recognises the platform app hosts", () => {
    assert.equal(isAppHost("app.mydomain.com", "mydomain.com"), true);
    assert.equal(isAppHost("mydomain.com", "MyDomain.com"), true);
    assert.equal(isAppHost("icecream.mydomain.com", "mydomain.com"), false);
    assert.equal(isAppHost("app.mydomain.com.evil.com", "mydomain.com"), false);
  });

  it("blocks direct access to the internal /s tree", () => {
    assert.equal(isInternalPath("/s/other.com/products"), true);
    assert.equal(isInternalPath("/s"), true);
    assert.equal(isInternalPath("/shop"), false);
    assert.equal(isInternalPath("/products"), false);
  });

  it("treats files as static except per-store sitemap and robots", () => {
    assert.equal(isStaticAsset("/logo.png"), true);
    assert.equal(isStaticAsset("/favicon.ico"), true);
    assert.equal(isStaticAsset("/sitemap.xml"), false);
    assert.equal(isStaticAsset("/robots.txt"), false);
    assert.equal(isStaticAsset("/products/vanilla"), false);
  });

  it("builds the internal tenant path", () => {
    assert.equal(tenantPath("icecream.mydomain.com", "/"), "/s/icecream.mydomain.com");
    assert.equal(tenantPath("www.icecream.com", "/products/vanilla"), "/s/www.icecream.com/products/vanilla");
  });
});

import { isApexHost, LANDING_PATH } from "../lib/host.ts";
import { formatPriceCompact } from "../lib/money.ts";

describe("marketing site routing", () => {
  it("identifies only the bare platform domain as the apex", () => {
    assert.equal(isApexHost("mydomain.com", "MyDomain.com"), true);
    assert.equal(isApexHost("localhost", "localhost"), true);
    assert.equal(isApexHost("app.mydomain.com", "mydomain.com"), false);
    assert.equal(isApexHost("icecream.mydomain.com", "mydomain.com"), false);
    assert.equal(isApexHost("www.icecream.com", "mydomain.com"), false);
    assert.equal(isApexHost("evilmydomain.com", "mydomain.com"), false);
    assert.equal(LANDING_PATH, "/landing");
  });

  it("formats marketing prices compactly", () => {
    assert.equal(formatPriceCompact(0, "USD", "en-US"), "$0");
    assert.equal(formatPriceCompact(500000, "USD", "en-US"), "$5,000");
    assert.equal(formatPriceCompact(499950, "USD", "en-US"), "$4,999.50");
    assert.equal(formatPriceCompact(100, "NOPE!", "en-US"), "1.00 NOPE!");
  });
});

describe("randomId", () => {
  it("falls back to getRandomValues when randomUUID is unavailable", async () => {
  const { randomId } = await import("../lib/random-id.ts");
  const original = crypto.randomUUID;
  Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  try {
    const id = randomId();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(id, randomId());
  } finally {
    Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
  }
});
});

describe("timelineSteps", () => {
  const states = async (status: string) => (await import("../lib/order-timeline.ts")).timelineSteps(status).map((s) => `${s.key}:${s.state}`);

  it("marks earlier steps done and the active step current", async () => {
    assert.deepEqual(await states("PENDING"), ["placed:current", "processing:upcoming", "shipped:upcoming", "delivered:upcoming"]);
    assert.deepEqual(await states("SHIPPED"), ["placed:done", "processing:done", "shipped:current", "delivered:upcoming"]);
  });

  it("treats delivered and completed orders as fully done", async () => {
    const all = ["placed:done", "processing:done", "shipped:done", "delivered:done"];
    assert.deepEqual(await states("DELIVERED"), all);
    assert.deepEqual(await states("COMPLETED"), all);
  });

  it("shows only placement then cancellation for a cancelled order", async () => {
    assert.deepEqual(await states("CANCELLED"), ["placed:done", "cancelled:cancelled"]);
  });
});

describe("homePathForRole", () => {
  it("sends platform admins to the console and everyone else to the dashboard", async () => {
    const { homePathForRole } = await import("../lib/admin/home.ts");
    assert.equal(homePathForRole("platform_admin"), "/admin");
    assert.equal(homePathForRole("merchant_owner"), "/dashboard");
    assert.equal(homePathForRole("merchant_staff"), "/dashboard");
  });
});
