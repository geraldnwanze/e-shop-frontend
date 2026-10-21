import type { NextConfig } from "next";

import { IMAGE_HOST_PATTERNS } from "./lib/images";

const platformDomain = process.env.PLATFORM_DOMAIN ?? "localhost";

const apiOrigin = (process.env.API_URL ?? "http://localhost:8000/api/v1").replace(/\/api\/v1\/?$/, "");

const nextConfig: NextConfig = {
  // Dev server only: let pages served from the platform domain and its subdomains load /_next assets and HMR.
  allowedDevOrigins: [platformDomain, `*.${platformDomain}`],
  // The Docker image builds a self-contained server (NEXT_OUTPUT=standalone); other hosts use the default output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Optional CDN origin that serves this app's /_next/static files (it must pull from this app). Unset = same origin.
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  images: {
    remotePatterns: IMAGE_HOST_PATTERNS.map((hostname) => ({ protocol: "https" as const, hostname })),
    // Uploaded images get a new address whenever they change, so optimised copies can be kept for a month.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Locally stored uploads (public disk) are served by the API; proxy them so every host loads them same-origin.
  async rewrites() {
    return [{ source: "/storage/:path*", destination: `${apiOrigin}/storage/:path*` }];
  },
  async headers() {
    return [
      // Fixed marketing images: cache for a day in browsers and CDNs, and let stale copies serve while refreshing.
      { source: "/themes/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
