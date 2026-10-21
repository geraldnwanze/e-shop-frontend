import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contrastRatio } from "../lib/color.ts";
import { FONT_OPTIONS, isHex } from "../lib/admin/theme.ts";
import { matchesPreset, presetFor, THEME_PRESETS } from "../lib/admin/theme-presets.ts";
import { readableOn } from "../lib/color.ts";

const SLUGS = ["minimal", "fashion", "modern", "electronics", "beauty", "restaurant"];

describe("theme presets", () => {
  it("has one for every template", () => {
    for (const slug of SLUGS) assert.ok(THEME_PRESETS[slug], slug);
    assert.equal(presetFor("unknown"), null);
    assert.equal(presetFor(null), null);
  });

  it("uses valid hex colours and fonts a store can actually pick", () => {
    for (const [slug, p] of Object.entries(THEME_PRESETS)) {
      for (const [key, value] of Object.entries(p.colors)) assert.ok(isHex(value), `${slug} ${key}`);
      assert.ok(FONT_OPTIONS.includes(p.fonts.heading), `${slug} heading font`);
      assert.ok(FONT_OPTIONS.includes(p.fonts.body), `${slug} body font`);
    }
  });

  it("keeps text readable on the background, and button text on primary and accent", () => {
    for (const [slug, p] of Object.entries(THEME_PRESETS)) {
      assert.ok(contrastRatio(p.colors.text, p.colors.background) >= 7, `${slug} text on background`);
      assert.ok(contrastRatio(p.colors.primary, readableOn(p.colors.primary)) >= 4.5, `${slug} on primary`);
      assert.ok(contrastRatio(p.colors.accent, readableOn(p.colors.accent)) >= 4.5, `${slug} on accent`);
      assert.ok(contrastRatio(p.colors.primary, p.colors.background) >= 4.5, `${slug} primary on background`);
    }
  });

  it("recognises a configuration that already matches", () => {
    const p = THEME_PRESETS.fashion;
    assert.equal(matchesPreset({ colors: { ...p.colors, primary: p.colors.primary.toUpperCase() }, fonts: p.fonts }, p), true);
    assert.equal(matchesPreset({ colors: p.colors, fonts: { ...p.fonts, body: "Inter" } }, p), false);
  });
});
