import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${env.scheme}://${env.platformDomain}/`, changeFrequency: "weekly", priority: 1 }];
}
