/** Server-side configuration. Never import this from client components. */
export const env = {
  /** Laravel API base, e.g. http://localhost:8000/api/v1 */
  apiUrl: (process.env.API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, ""),
  /** Root platform domain, e.g. mydomain.com (localhost in dev). */
  platformDomain: (process.env.PLATFORM_DOMAIN ?? "localhost").toLowerCase(),
  /** Scheme used when building absolute storefront URLs. */
  scheme: process.env.STOREFRONT_SCHEME ?? "https",
  /** Seconds the store bundle / catalogue may be served from the Next data cache. */
  revalidate: Number(process.env.STOREFRONT_REVALIDATE ?? 60),
};
