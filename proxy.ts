import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAppHost, isApexHost, isInternalPath, isStaticAsset, LANDING_PATH, normalizeHost, tenantPath } from "./lib/host";

const platformDomain = (process.env.PLATFORM_DOMAIN ?? "localhost").toLowerCase();

/**
 * The single place a hostname is interpreted.
 *
 *   icecream.mydomain.com/products  ->  /s/icecream.mydomain.com/products
 *   www.icecream.com/products       ->  /s/www.icecream.com/products
 *   mydomain.com/                   ->  /landing (public marketing page)
 *   app.mydomain.com/...            ->  platform dashboard (untouched)
 *
 * Everything under /s/[host] receives the hostname as a route param, so pages,
 * metadata and the data cache are all naturally keyed per host. The Laravel API
 * does the actual host -> tenant lookup.
 */
export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host"));
  const { pathname } = request.nextUrl;

  if (!host) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // /s/... is internal-only: never let a visitor address another host's tree.
  if (isInternalPath(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // The public marketing site: only the bare platform domain's front page.
  if (pathname === "/" && isApexHost(host, platformDomain)) {
    const url = request.nextUrl.clone();
    url.pathname = LANDING_PATH;

    return NextResponse.rewrite(url);
  }

  if (isAppHost(host, platformDomain) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = tenantPath(host, pathname);

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api/|_next/|storage/).*)"],
};
