import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { forgotPasswordSchema, resetPasswordSchema } from "../lib/schemas.ts";

describe("password reset forms", () => {
  it("needs a valid email to ask for a link", () => {
    assert.equal(forgotPasswordSchema.safeParse({ email: "ada@mail.test" }).success, true);
    for (const bad of ["", "ada", "ada@"]) assert.equal(forgotPasswordSchema.safeParse({ email: bad }).success, false, bad);
  });

  it("applies the same password rules as sign-up, and needs the two entries to match", () => {
    assert.equal(resetPasswordSchema.safeParse({ password: "brand-new-pass1", passwordConfirmation: "brand-new-pass1" }).success, true);
    for (const weak of ["short1", "nodigitshere", "12345678"]) assert.equal(resetPasswordSchema.safeParse({ password: weak, passwordConfirmation: weak }).success, false, weak);
    assert.equal(resetPasswordSchema.safeParse({ password: "brand-new-pass1", passwordConfirmation: "different-pass2" }).success, false);
  });
});
