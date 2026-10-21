import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/admin", "/s/"] }],
    sitemap: `${env.scheme}://${env.platformDomain}/sitemap.xml`,
  };
}
