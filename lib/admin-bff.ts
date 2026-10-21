/**
 * Pure helpers for the merchant dashboard BFF (/api/admin). Unit-tested with node --test.
 */

const SEGMENT = /^[A-Za-z0-9_.-]{1,128}$/;
const ID = "[^/]+";

type Rule = { methods: string[]; pattern: RegExp };

const r = (methods: string, pattern: string): Rule => ({ methods: methods.split("|"), pattern: new RegExp(`^${pattern}$`) });

/** Public (unauthenticated) endpoints: no session cookie required. */
export const PUBLIC_PATHS = new Set(["auth/login", "auth/register", "auth/forgot-password", "auth/reset-password"]);

/** Merchant API endpoints reachable from the dashboard UI. Everything else is refused. */
const ALLOWED: Rule[] = [
  r("POST", "auth/(login|register|logout|forgot-password|reset-password)"),
  r("GET", "auth/me"),
  r("POST", "auth/email/resend"),
  r("GET", "dashboard/stats"),
  r("GET", "billing"),
  r("GET|POST", "shipping-zones"),
  r("GET|PUT|DELETE", `shipping-zones/${ID}`),
  r("GET", "shipping/locations"),
  r("POST", "billing/(checkout|verify|cancel|resume)"),
  r("GET|PUT", "store"),
  r("GET|PUT", "store/(settings|theme)"),
  r("POST", "store/settings/test-email"),
  r("POST|DELETE", "store/(logo|favicon)"),
  r("GET", "themes"),
  r("GET|POST", "media"),
  r("PATCH|DELETE", `media/${ID}`),
  r("POST", `media/${ID}/replace`),
  r("GET|POST", "domains"),
  r("GET|DELETE", `domains/${ID}`),
  r("POST", `domains/${ID}/(verify|primary)`),
  r("GET|POST", "pages"),
  r("GET|PUT|DELETE", `pages/${ID}`),
  r("GET|POST", "categories"),
  r("GET|PUT|PATCH|DELETE", `categories/${ID}`),
  r("GET|POST", "products"),
  r("GET|PUT|PATCH|DELETE", `products/${ID}`),
  r("GET|POST", `products/${ID}/inventory`),
  r("GET|POST", "discounts"),
  r("GET|PUT|PATCH|DELETE", `discounts/${ID}`),
  r("GET", "orders"),
  r("GET", `orders/${ID}`),
  r("GET", `orders/${ID}/invoice`),
  r("POST", `orders/${ID}/void`),
  r("POST", "pos/sales"),
  r("GET", "pos/shift"),
  r("GET|POST", "pos/shifts"),
  r("GET", `pos/shifts/${ID}`),
  r("POST", `pos/shifts/${ID}/close`),
  r("GET", "pos/reports/cashiers"),
  r("PATCH", `orders/${ID}/status`),
  r("POST", `orders/${ID}/refund`),
  r("GET", "customers"),
  r("GET", `customers/${ID}`),
  r("GET", "reviews"),
  r("PATCH|DELETE", `reviews/${ID}`),
  r("DELETE", `reviews/${ID}/photos/${ID}`),
  r("GET|POST", "campaign-series"),
  r("GET|PATCH|DELETE", `campaign-series/${ID}`),
  r("GET|POST", "email-campaigns"),
  r("POST", "email-campaigns/(audience|test)"),
  r("GET|PATCH", `email-campaigns/${ID}`),
  r("GET", `email-campaigns/${ID}/(recipients|export)`),
  r("POST", `email-campaigns/${ID}/cancel`),
  r("GET|POST", "customer-segments"),
  r("POST", "customer-segments/preview"),
  r("GET|PUT|PATCH|DELETE", `customer-segments/${ID}`),
  r("GET", `customer-segments/${ID}/(customers|export)`),
  r("GET", "payment-gateways"),
  r("PUT|DELETE", "payment-gateways/(paystack|flutterwave)"),

  // Platform administration. The API rejects non-platform-admin tokens with 403; the BFF only
  // keeps the surface explicit (no tenant creation, no admin user creation, no hard deletes of tenants/users).
  r("GET", "admin/(overview|settings)"),
  r("PUT", "admin/settings"),
  r("GET", "admin/tenants"),
  r("GET", `admin/tenants/${ID}`),
  r("POST", `admin/tenants/${ID}/(suspend|activate|subscription)`),
  r("GET", "admin/(stores|users|domains|subscriptions)"),
  r("GET", "admin/audit-logs"),
  r("GET", `admin/audit-logs/${ID}`),
  r("GET|PATCH", `admin/(stores|users)/${ID}`),
  r("POST", `admin/users/${ID}/(suspend|activate|revoke-tokens|password-reset|verify-email)`),
  r("GET|POST", "admin/(themes|plans)"),
  r("PUT|DELETE", `admin/(themes|plans)/${ID}`),
  r("PATCH", `admin/subscriptions/${ID}`),
  r("POST", `admin/domains/${ID}/verify`),
  r("DELETE", `admin/domains/${ID}`),
];

/** Returns the validated upstream path, or null if the request must be refused. */
export function resolveAdminPath(method: string, segments: string[]): string | null {
  if (segments.length === 0 || segments.some((s) => !SEGMENT.test(s) || s === "." || s === "..")) return null;

  const path = segments.join("/");

  return ALLOWED.some((rule) => rule.methods.includes(method) && rule.pattern.test(path)) ? path : null;
}

/**
 * Strict same-origin check for the cookie-authenticated dashboard: state-changing
 * requests MUST carry an Origin header matching the dashboard host.
 */
export function isStrictSameOrigin(origin: string | null, host: string, normalize: (h: string) => string): boolean {
  if (origin === null) return false;
  try {
    return normalize(new URL(origin).host) === host;
  } catch {
    return false;
  }
}

export const ADMIN_SESSION_COOKIE = "mt_token";

/** Body types the BFF will forward on writes. */
export function isForwardableContentType(contentType: string | null): boolean {
  const type = (contentType ?? "").toLowerCase();

  return type.startsWith("application/json") || type.startsWith("multipart/form-data");
}

/** Successful merchant writes that can change what a storefront shows (everything except auth and payment keys). */
export function affectsStorefront(method: string, path: string): boolean {
  return method !== "GET" && !path.startsWith("auth/") && !path.startsWith("payment-gateways") && !path.startsWith("admin/");
}

/** Platform-admin writes return the affected tenant (with its domains) when a storefront changed, e.g. suspend/activate. */
export function adminResponseTags(payload: unknown): string[] {
  const domains = (payload as { data?: { domains?: unknown } } | null)?.data?.domains;

  return Array.isArray(domains) ? storefrontTags(domains.filter((d): d is { domain: string; isVerified: boolean } => typeof d?.domain === "string").map((d) => ({ domain: d.domain, isVerified: d.isVerified !== false }))) : [];
}

/** Cache tags to invalidate: one per verified hostname of the store (matches lib/api/server.ts tags). */
export function storefrontTags(domains: { domain: string; isVerified: boolean }[]): string[] {
  const hosts = new Set<string>();

  for (const d of domains) {
    if (!d.isVerified) continue;
    const host = d.domain.toLowerCase();
    hosts.add(host);
    // The resolver treats www <-> apex as the same site, so either spelling may be what visitors use.
    hosts.add(host.startsWith("www.") ? host.slice(4) : host.split(".").length === 2 ? `www.${host}` : host);
  }

  return [...hosts].map((h) => `tenant:${h}`);
}
