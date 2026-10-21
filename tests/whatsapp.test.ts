import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cartMessage, productMessage, whatsappLink } from "../lib/whatsapp.ts";

const on = { enabled: true, number: "2348012345678", message: null };

describe("whatsappLink", () => {
  it("builds a wa.me link with the message encoded", () => {
    const link = whatsappLink(on, "Hi there & hello");

    assert.equal(link, "https://wa.me/2348012345678?text=Hi%20there%20%26%20hello");
  });

  it("returns null when disabled, missing or malformed", () => {
    assert.equal(whatsappLink(undefined, "x"), null);
    assert.equal(whatsappLink({ ...on, enabled: false }, "x"), null);
    assert.equal(whatsappLink({ ...on, number: null }, "x"), null);
    assert.equal(whatsappLink({ ...on, number: "+234 80" }, "x"), null);
  });
});

describe("messages", () => {
  it("describes one product with its option, quantity, total and link", () => {
    const text = productMessage(on, { name: "Cookies & Cream", variantName: "Tub", quantity: 2, unitPrice: 270000, currency: "NGN", url: "https://s.test/products/c" });

    assert.match(text, /^Hi, I'd like to order:/);
    assert.match(text, /2 × Cookies & Cream \(Tub\)/);
    assert.match(text, /5,400\.00/);
    assert.match(text, /https:\/\/s\.test\/products\/c$/);
  });

  it("uses the merchant's opening message", () => {
    const text = productMessage({ ...on, message: "Hello Scoops!" }, { name: "A", quantity: 1, unitPrice: 100, currency: "NGN", url: "u" });

    assert.ok(text.startsWith("Hello Scoops!"));
  });

  it("lists every cart line and the subtotal", () => {
    const text = cartMessage(on, { currency: "NGN", subtotal: 500, items: [{ name: "A", variantName: null, quantity: 1, lineTotal: 200 }, { name: "B", variantName: "Big", quantity: 3, lineTotal: 300 }] });

    assert.match(text, /• 1 × A — /);
    assert.match(text, /• 3 × B \(Big\) — /);
    assert.match(text, /Subtotal: /);
  });
});
