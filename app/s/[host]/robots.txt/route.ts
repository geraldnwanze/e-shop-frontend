import { getStoreBundle } from "@/lib/api/server";
import { env } from "@/lib/env";
import { canonicalOrigin } from "@/lib/seo";

type Ctx = { params: Promise<{ host: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { host } = await params;
  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" };

  try {
    const bundle = await getStoreBundle(host);
    const origin = canonicalOrigin(bundle, host, env.scheme);

    const body = ["User-agent: *", "Allow: /", "Disallow: /cart", "Disallow: /checkout", "Disallow: /account", "Disallow: /orders", "Disallow: /api/", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n");

    return new Response(body, { headers });
  } catch {
    // Unknown or suspended store: keep crawlers out.
    return new Response("User-agent: *\nDisallow: /\n", { headers });
  }
}
