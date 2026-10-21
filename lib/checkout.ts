/**
 * Pure checkout helpers (unit-tested with node --test; relative imports only).
 */

export interface CheckoutValues {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Ticked "email me news and offers". Never ticked for them: it is an opt-in. */
  acceptsMarketing?: boolean;
  shipping: AddressValues;
  billingSameAsShipping: boolean;
  billing?: AddressValues;
  discountCode?: string;
  notes?: string;
  /** The delivery method the customer picked (an id, never a price). */
  shippingRateId?: string | null;
}

export interface AddressValues {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
}

const blank = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

export function toApiAddress(a: AddressValues) {
  return {
    first_name: a.firstName.trim(),
    last_name: a.lastName.trim(),
    line1: a.line1.trim(),
    line2: blank(a.line2),
    city: a.city.trim(),
    state: blank(a.state),
    postal_code: blank(a.postalCode),
    country: a.country.trim().toUpperCase(),
    phone: blank(a.phone),
  };
}

/** Build the POST /storefront/checkout body. Prices/totals are never sent: the server computes them. */
export function toCheckoutPayload(cartId: string, v: CheckoutValues) {
  return {
    cart_id: cartId,
    customer: { email: v.email.trim().toLowerCase(), first_name: v.firstName.trim(), last_name: v.lastName.trim(), phone: blank(v.phone), accepts_marketing: v.acceptsMarketing === true },
    shipping_address: toApiAddress(v.shipping),
    shipping_rate_id: v.shippingRateId ?? null,
    billing_address: v.billingSameAsShipping || !v.billing ? null : toApiAddress(v.billing),
    discount_code: blank(v.discountCode),
    notes: blank(v.notes),
  };
}

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Map a Laravel error key ("shipping_address.postal_code") to a form field key ("shipping.postalCode"). */
export function serverKeyToField(key: string): string {
  return key
    .replace(/^shipping_address\./, "shipping.")
    .replace(/^billing_address\./, "billing.")
    .replace(/^customer\./, "")
    .split(".")
    .map(camel)
    .join(".");
}

/** Validate that a payment redirect target is an absolute https URL. */
export function isSafeRedirect(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
