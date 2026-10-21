import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeCode } from "../lib/recovery-code.ts";

describe("normalizeCode", () => {
  it("tidies a valid code", () => {
    assert.equal(normalizeCode(" back-ab12cd "), "BACK-AB12CD");
    assert.equal(normalizeCode("SAVE_10"), "SAVE_10");
  });

  it("rejects anything that is not a plausible code", () => {
    for (const bad of [null, undefined, "", "ab", "has space", "<script>", "x".repeat(41), "a;b"]) assert.equal(normalizeCode(bad), null, String(bad));
  });
});
