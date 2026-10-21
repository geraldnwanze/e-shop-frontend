import type { Product, StoreBundle } from "./types";

/** Preferred public origin: the store's primary verified domain, else the requested host. */
export function canonicalOrigin(bundle: StoreBundle, host: string, scheme: string): string {
  return `${scheme}://${bundle.primaryDomain ?? host}`;
}

/** Truncate for meta descriptions without cutting words mid-way. */
export function truncate(text: string | null | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** JSON-LD must be serialised with "<" escaped to prevent script-tag injection. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function productJsonLd(product: Product, bundle: StoreBundle, origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map((i) => i.url).filter(Boolean),
    url: `${origin}/products/${product.slug}`,
    brand: { "@type": "Brand", name: bundle.store.name },
    offers: {
      "@type": "Offer",
      priceCurrency: bundle.store.currency,
      price: (product.price / 100).toFixed(2),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${origin}/products/${product.slug}`,
    },
    // Lets search engines show star ratings; only included once there is something to show.
    ...(product.ratingCount && product.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: (product.ratingAverage ?? 0).toFixed(1), reviewCount: product.ratingCount } } : {}),
  };
}
