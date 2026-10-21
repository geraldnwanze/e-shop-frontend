/**
 * Pure helpers for the /api/shop backend-for-frontend (unit-tested with node --test).
 */

const SEGMENT = /^[A-Za-z0-9_.-]{1,128}$/;

type Rule = { method: string; pattern: RegExp };

/** Methods that carry a JSON body. A DELETE has none, so it only has to pass the same-origin check. */
export function requiresJsonBody(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

/** The one storefront endpoint that takes a file (a review photo) instead of JSON. */
export function isUploadRequest(method: string, upstreamPath: string): boolean {
  return method === "POST" && upstreamPath === "review-photos";
}

/** Largest request body forwarded: a photo may be up to 6 MB, everything else is small JSON. */
export function maxBodyBytes(method: string, upstreamPath: string): number {
  return isUploadRequest(method, upstreamPath) ? 6_000_000 : 200_000;
}

/** Only these storefront endpoints are reachable from the browser. */
const ALLOWED: Rule[] = [
  { method: "GET", pattern: /^(products|categories)$/ },
  { method: "GET", pattern: /^products\/[^/]+$/ },
  { method: "GET", pattern: /^products\/[^/]+\/reviews$/ },
  { method: "POST", pattern: /^products\/[^/]+\/reviews$/ },
  { method: "POST", pattern: /^review-photos$/ },
  { method: "DELETE", pattern: /^review-photos\/[^/]+$/ },
  { method: "GET", pattern: /^products\/[^/]+\/reviews\/mine$/ },
  { method: "DELETE", pattern: /^products\/[^/]+\/reviews\/mine$/ },
  { method: "POST", pattern: /^cart$/ },
  { method: "GET", pattern: /^cart\/[^/]+$/ },
  { method: "PUT", pattern: /^cart\/[^/]+\/contact$/ },
  { method: "POST", pattern: /^cart\/[^/]+\/items$/ },
  { method: "POST", pattern: /^cart\/[^/]+\/discount$/ },
  { method: "PATCH", pattern: /^cart\/[^/]+\/items\/[^/]+$/ },
  { method: "DELETE", pattern: /^cart\/[^/]+\/items\/[^/]+$/ },
  { method: "POST", pattern: /^checkout$/ },
  { method: "GET", pattern: /^shipping\/locations$/ },
  { method: "POST", pattern: /^shipping\/options$/ },
  { method: "POST", pattern: /^payments\/initialize$/ },
  { method: "GET", pattern: /^payments\/[^/]+\/verify$/ },
  { method: "POST", pattern: /^orders\/track$/ },
  { method: "POST", pattern: /^newsletter$/ },
  { method: "POST", pattern: /^products\/[^/]+\/stock-alerts$/ },
  { method: "POST", pattern: /^auth\/(register|login|logout|forgot-password|reset-password)$/ },
  { method: "GET", pattern: /^auth\/me$/ },
  { method: "GET", pattern: /^account\/(addresses|orders|wishlist)$/ },
  { method: "PUT", pattern: /^account\/wishlist\/[^/]+$/ },
  { method: "DELETE", pattern: /^account\/wishlist\/[^/]+$/ },
  { method: "POST", pattern: /^account\/addresses$/ },
  { method: "DELETE", pattern: /^account\/addresses\/[^/]+$/ },
  { method: "GET", pattern: /^account\/orders\/[^/]+$/ },
  { method: "GET", pattern: /^account\/orders\/[^/]+\/invoice$/ },
];

/** Returns the validated upstream path, or null if the request must be refused. */
export function resolveUpstreamPath(method: string, segments: string[]): string | null {
  if (segments.length === 0 || segments.some((s) => !SEGMENT.test(s) || s === "." || s === "..")) return null;

  const path = segments.join("/");

  return ALLOWED.some((rule) => rule.method === method && rule.pattern.test(path)) ? path : null;
}

/** Same-origin check for state-changing requests (defence in depth on top of SameSite=Lax). */
export function isSameOrigin(origin: string | null, host: string, normalize: (h: string) => string): boolean {
  if (origin === null) return true; // non-browser / same-origin GET
  try {
    return normalize(new URL(origin).host) === host;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "sf_token";
