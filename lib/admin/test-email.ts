export type TestEmailType = "abandoned_cart_first" | "abandoned_cart_followup" | "review_request" | "review_digest";

/** Body for the "send me a test" call. The follow-up preview carries the percentage typed on screen, even if unsaved. */
export function testEmailPayload(type: TestEmailType, discountPercent: number): { type: TestEmailType; discount_percent?: number } {
  if (type === "abandoned_cart_followup" && Number.isInteger(discountPercent) && discountPercent >= 0 && discountPercent <= 50) {
    return { type, discount_percent: discountPercent };
  }

  return { type };
}
