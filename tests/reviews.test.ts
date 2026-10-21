import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { distributionPercents, formatAverage, photoProblem, photoSlotsLeft, reviewBlockedMessage, starFills } from "../lib/reviews.ts";

describe("starFills", () => {
  it("fills whole and half stars, rounding to the nearest half", () => {
    assert.deepEqual(starFills(4.5), [1, 1, 1, 1, 0.5]);
    assert.deepEqual(starFills(3.2), [1, 1, 1, 0, 0]);
    assert.deepEqual(starFills(3.3), [1, 1, 1, 0.5, 0]);
    assert.deepEqual(starFills(5), [1, 1, 1, 1, 1]);
    assert.deepEqual(starFills(0), [0, 0, 0, 0, 0]);
  });

  it("stays inside 0 to 5", () => {
    assert.deepEqual(starFills(9), [1, 1, 1, 1, 1]);
    assert.deepEqual(starFills(-2), [0, 0, 0, 0, 0]);
  });
});

describe("formatAverage", () => {
  it("shows at most one decimal", () => {
    assert.equal(formatAverage(4.5), "4.5");
    assert.equal(formatAverage(4.666), "4.7");
    assert.equal(formatAverage(5), "5");
  });
});

describe("distributionPercents", () => {
  it("lists five stars first with each share of the total", () => {
    const rows = distributionPercents({ count: 4, distribution: { "5": 2, "4": 1, "3": 1, "2": 0, "1": 0 } });

    assert.deepEqual(rows.map((r) => [r.stars, r.count, r.percent]), [[5, 2, 50], [4, 1, 25], [3, 1, 25], [2, 0, 0], [1, 0, 0]]);
  });

  it("is all zeros with no reviews", () => {
    assert.ok(distributionPercents({ count: 0, distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 } }).every((r) => r.percent === 0));
  });
});

describe("reviewBlockedMessage", () => {
  it("explains why a shopper cannot review, and says nothing when they can", () => {
    assert.match(reviewBlockedMessage(undefined, false) ?? "", /Sign in/);
    assert.equal(reviewBlockedMessage({ eligible: true, reason: null, review: null }, true), null);
    assert.match(reviewBlockedMessage({ eligible: false, reason: "purchase_required", review: null }, true) ?? "", /bought/);
    assert.match(reviewBlockedMessage({ eligible: false, reason: "reviews_off", review: null }, true) ?? "", /turned off/);
  });
});

describe("product structured data", () => {
  const product = { name: "P", slug: "p", description: null, shortDescription: null, price: 1000, inStock: true, images: [] } as never;
  const bundle = { store: { name: "S", currency: "NGN" } } as never;

  it("adds an aggregate rating only once there are reviews", async () => {
    const { productJsonLd } = await import("../lib/seo.ts");

    assert.equal("aggregateRating" in productJsonLd(product, bundle, "https://s.test"), false);
    assert.deepEqual((productJsonLd({ ...(product as object), ratingAverage: 4.5, ratingCount: 3 } as never, bundle, "https://s.test") as { aggregateRating: unknown }).aggregateRating, { "@type": "AggregateRating", ratingValue: "4.5", reviewCount: 3 });
  });
});

describe("photoProblem", () => {
  it("accepts ordinary photos", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) assert.equal(photoProblem({ type, size: 2_000_000 }), null, type);
  });

  it("rejects other formats, oversized and empty files", () => {
    for (const type of ["image/gif", "image/svg+xml", "application/pdf", ""]) assert.match(photoProblem({ type, size: 1000 }) ?? "", /JPG, PNG or WebP/, type);
    assert.match(photoProblem({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }) ?? "", /5 MB/);
    assert.match(photoProblem({ type: "image/jpeg", size: 0 }) ?? "", /empty/);
  });
});

describe("photoSlotsLeft", () => {
  it("counts down from three and stops at zero", () => {
    assert.deepEqual([0, 1, 3, 5].map(photoSlotsLeft), [3, 2, 0, 0]);
  });
});
