import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { catalogueShareText, groupByCategory, whatsappShareLink } from "../lib/catalogue.ts";
import type { Product } from "../lib/types.ts";

const product = (name: string, category: { name: string; slug: string } | null): Product => ({
  id: name, name, slug: name.toLowerCase(), description: null, shortDescription: null, price: 100, compareAtPrice: null, inStock: true,
  category: category ? { id: category.slug, ...category } : null, variants: [], images: [],
});

describe("groupByCategory", () => {
  it("sorts categories A to Z, keeps product order and puts uncategorised last", () => {
    const sections = groupByCategory([
      product("loose", null),
      product("zebra", { name: "Tubs", slug: "tubs" }),
      product("cup1", { name: "Cups", slug: "cups" }),
      product("tub2", { name: "Tubs", slug: "tubs" }),
    ]);

    assert.deepEqual(sections.map((s) => s.name), ["Cups", "Tubs", "Other products"]);
    assert.deepEqual(sections[1].products.map((p) => p.name), ["zebra", "tub2"]);
    assert.equal(sections[2].slug, null);
  });

  it("returns nothing for an empty catalogue", () => {
    assert.deepEqual(groupByCategory([]), []);
  });
});

describe("sharing", () => {
  it("puts the link under a short sentence and encodes it for WhatsApp", () => {
    const text = catalogueShareText("Scoops", "https://scoops.test/catalogue");

    assert.equal(text, "Browse the Scoops catalogue and order here:\nhttps://scoops.test/catalogue");
    assert.equal(whatsappShareLink(text), `https://wa.me/?text=${encodeURIComponent(text)}`);
  });
});
