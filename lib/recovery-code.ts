/** The discount code a reminder email passes along in its recovery link (`?code=BACK-AB12CD`). */
export const RECOVERY_CODE_KEY = "sf:discount";

/** Returns a tidy, upper-case code, or null when the value does not look like a discount code. */
export function normalizeCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();

  return /^[A-Z0-9_-]{3,40}$/.test(code) ? code : null;
}
