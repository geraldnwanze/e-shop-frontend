/** All API money is an integer in minor units (150000 = 1,500.00). */
export function formatMoney(minor: number, currency: string, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;

  return Math.round(((compareAt - price) / compareAt) * 100);
}

/**
 * Parse a merchant-typed amount ("1,500.50", "1500", "  12.5 ") into minor units.
 * Returns null for anything that is not a plain non-negative amount with at most 2 decimals.
 */
export function toMinor(input: string): number | null {
  const clean = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;

  const [whole, frac = ""] = clean.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));

  return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units -> editable "1500.50" string (no thousands separators). */
export function fromMinor(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";

  return (minor / 100).toFixed(2);
}

/** Marketing price: no ".00" for whole amounts, local currency symbol where the locale knows it. */
export function formatPriceCompact(minor: number, currency: string, locale = "en-NG"): string {
  const whole = minor % 100 === 0;

  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return formatMoney(minor, currency);
  }
}
