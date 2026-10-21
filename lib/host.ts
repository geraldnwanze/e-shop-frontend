/**
 * Hostname helpers. Kept dependency-free (relative imports only) so they run in
 * the proxy, in server components and under `node --test`.
 */

const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

/** Lowercase, strip port and trailing dot. Returns "" for invalid input. */
export function normalizeHost(input: string | null | undefined): string {
  if (!input) return "";

  const host = input.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

  return host.length <= 253 && HOST_PATTERN.test(host) ? host : "";
}

/** The platform's own app/admin hosts (dashboard), which are never storefronts. */
export function isAppHost(host: string, platformDomain: string, appSubdomain = "app"): boolean {
  const platform = platformDomain.toLowerCase();

  return host === `${appSubdomain}.${platform}` || host === platform;
}

/** `/s/<host>/...` is an internal route; it must never be requested directly. */
export function isInternalPath(pathname: string): boolean {
  return pathname === "/s" || pathname.startsWith("/s/");
}

/** Static files (favicon, images...) bypass tenant rewriting, except the per-store sitemap/robots. */
export function isStaticAsset(pathname: string): boolean {
  if (pathname === "/sitemap.xml" || pathname === "/robots.txt") return false;

  return /\.[a-z0-9]{2,5}$/i.test(pathname);
}

/** Internal path a public request for `host` + `pathname` is rewritten to. */
export function tenantPath(host: string, pathname: string): string {
  return `/s/${host}${pathname === "/" ? "" : pathname}`;
}

/** The bare platform domain (mydomain.com / localhost): where the public marketing site lives. */
export function isApexHost(host: string, platformDomain: string): boolean {
  return host === platformDomain.toLowerCase();
}

/** Internal path of the marketing landing page, served for "/" on the apex host only. */
export const LANDING_PATH = "/landing";
