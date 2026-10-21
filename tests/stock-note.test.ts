import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stockNote } from "../lib/stock-note.ts";

describe("stockNote", () => {
  it("words the note for one and for several", () => {
    assert.equal(stockNote(1), "Only 1 left, order soon");
    assert.equal(stockNote(4), "Only 4 left");
  });

  it("says nothing when stock is not low or not known", () => {
    for (const none of [null, undefined, 0, -2]) assert.equal(stockNote(none), null, String(none));
  });
});
