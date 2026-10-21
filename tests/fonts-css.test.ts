import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FONT_OPTIONS } from "../lib/admin/theme.ts";

describe("font variables", () => {
  it("declares a CSS variable for every font a store can pick", async () => {
    const source = await (await import("node:fs/promises")).readFile(new URL("../lib/fonts.ts", import.meta.url), "utf8");

    for (const name of FONT_OPTIONS) {
      const key = name.includes(" ") ? `"${name}"` : name;
      const mapped = new RegExp(`^\\s*${key}: "--font-[a-z-]+",$`, "m");
      assert.match(source, mapped, `${name} has no CSS variable in cssVariables`);
    }
  });

  it("never builds the font stack from a className", async () => {
    const source = await (await import("node:fs/promises")).readFile(new URL("../lib/fonts.ts", import.meta.url), "utf8");

    assert.doesNotMatch(source, /var\(\$\{font\.variable\}\)/);
  });
});
