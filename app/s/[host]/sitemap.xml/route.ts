import { getProducts, getStoreBundle } from "@/lib/api/server";
import { env } from "@/lib/env";
import { canonicalOrigin } from "@/lib/seo";

type Ctx = { params: Promise<{ host: string }> };

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Per-store sitemap built from that store's own catalogue and canonical origin. */
export async function GET(_request: Request, { params }: Ctx) {
  const { host } = await params;

  try {
    const bundle = await getStoreBundle(host);
    const origin = canonicalOrigin(bundle, host, env.scheme);
    const urls = [`${origin}/`, `${origin}/products`, `${origin}/catalogue`];

    for (let page = 1; page <= 20; page++) {
      const result = await getProducts(host, { page, per_page: 48 });
      urls.push(...result.items.map((p) => `${origin}/products/${p.slug}`));
      if (page >= result.lastPage) break;
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join("\n")}\n</urlset>\n`;

    return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
