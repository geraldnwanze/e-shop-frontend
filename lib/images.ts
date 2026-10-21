/** Hosts product/brand images may be served from (also used by next.config.ts remotePatterns). */
export const IMAGE_HOST_PATTERNS: string[] = [
  "res.cloudinary.com",
  "**.digitaloceanspaces.com",
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? process.env.IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
];

function matches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("**.")) return hostname.endsWith(pattern.slice(2));
  return hostname === pattern;
}

/** True when next/image is configured to optimise this URL; otherwise render it unoptimised. */
export function isOptimizable(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && IMAGE_HOST_PATTERNS.some((p) => matches(hostname, p));
  } catch {
    return false;
  }
}
