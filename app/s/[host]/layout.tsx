import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { StoreShell } from "@/components/store/StoreShell";
import { ApiError, getStoreBundle } from "@/lib/api/server";
import { env } from "@/lib/env";
import { canonicalOrigin, truncate } from "@/lib/seo";
import { loadStore } from "@/lib/store-page";
import type { StoreBundle } from "@/lib/types";

type Props = { children: ReactNode; params: Promise<{ host: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { host } = await params;
  let bundle: StoreBundle;

  try {
    bundle = await getStoreBundle(host);
  } catch (error) {
    const missing = error instanceof ApiError && error.status === 404;

    return { title: missing ? "Store not found" : "Store unavailable", robots: { index: false, follow: false } };
  }

  const origin = canonicalOrigin(bundle, host, env.scheme);
  const { store, settings, configuration } = bundle;
  const title = settings.seo.title ?? store.name;
  const description = settings.seo.description ?? truncate(store.description) ?? undefined;
  const image = settings.seo.og_image ?? store.logo ?? configuration.hero.image_url ?? undefined;

  return {
    metadataBase: new URL(origin),
    title: { default: title, template: `%s | ${store.name}` },
    description,
    icons: store.favicon ? { icon: store.favicon } : undefined,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: store.name, title, description, url: origin, images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function StoreLayout({ children, params }: Props) {
  const { host } = await params;
  const result = await loadStore(host);

  if ("unavailable" in result) {
    return (
      <main className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-2xl font-bold">This store is temporarily unavailable</h1>
        <p className="mt-3 opacity-70">Please check back soon.</p>
      </main>
    );
  }

  return (
    <Providers>
      <StoreShell bundle={result.bundle}>{children}</StoreShell>
    </Providers>
  );
}
