import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { ProductReviews } from "@/components/store/ProductReviews";
import { Stars } from "@/components/store/Stars";
import { Container } from "@/components/ui/Container";
import { getProduct, getRelatedProducts } from "@/lib/api/server";
import { jsonLd, productJsonLd, truncate } from "@/lib/seo";
import { requireStore } from "@/lib/store-page";
import { getTheme } from "@/themes";

type Props = { params: Promise<{ host: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host, slug } = await params;
  const product = await getProduct(host, slug).catch(() => null);

  if (!product) return { title: "Product not found", robots: { index: false } };

  const description = truncate(product.shortDescription ?? product.description);
  const image = product.images[0]?.url ?? undefined;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: "website", title: product.name, description, images: image ? [{ url: image, alt: product.images[0]?.alt ?? product.name }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title: product.name, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { host, slug } = await params;
  const { bundle, origin } = await requireStore(host);
  const product = await getProduct(host, slug);

  if (!product) notFound();

  const related = await getRelatedProducts(host, slug);
  const theme = getTheme(bundle.theme?.slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd(product, bundle, origin)) }} />

      <section className="border-b border-black/5 bg-primary/[0.04]">
        <Container className="py-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 text-sm opacity-70">
            <Link href="/" className="underline-offset-4 hover:underline">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/products" className="underline-offset-4 hover:underline">Products</Link>
            {product.category ? <><span aria-hidden="true">/</span><Link href={`/products?category=${product.category.slug}`} className="underline-offset-4 hover:underline">{product.category.name}</Link></> : null}
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-medium opacity-100">{product.name}</span>
          </nav>
        </Container>
      </section>

      <Container className="py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <ProductGallery images={product.images} name={product.name} />
          <div className="lg:sticky lg:top-24 lg:self-start">
            {product.category ? <Link href={`/products?category=${product.category.slug}`} className="text-xs font-semibold uppercase tracking-[0.2em] text-accent brightness-90">{product.category.name}</Link> : null}
            <h1 className="font-heading mt-2 text-3xl leading-tight sm:text-4xl" style={{ textTransform: "var(--sf-heading-transform)" as never, letterSpacing: "var(--sf-heading-tracking)", fontWeight: "var(--sf-heading-weight)" as never }}>{product.name}</h1>
            {bundle.settings.reviews?.enabled !== false && (product.ratingCount ?? 0) > 0 ? <a href="#reviews" className="mt-3 inline-block"><Stars average={product.ratingAverage ?? 0} count={product.ratingCount} /></a> : null}
            {product.shortDescription ? <p className="mt-4 text-lg leading-relaxed opacity-80">{product.shortDescription}</p> : null}
            <ProductPurchase product={product} currency={bundle.store.currency} acceptingOrders={bundle.acceptingOrders !== false} whatsapp={bundle.settings.whatsapp} productUrl={`${origin}/products/${product.slug}`} />
            {product.description ? (
              <section className="mt-8 rounded-[var(--sf-radius)] bg-primary/[0.04] p-6">
                <h2 className="mb-3 font-heading text-lg font-semibold">About this product</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed opacity-80">{product.description}</p>
              </section>
            ) : null}
          </div>
        </div>
      </Container>

      {related.length > 0 ? (
        <section aria-labelledby="related-h" className="border-t border-black/5 bg-primary/[0.03] py-14">
          <Container>
            <h2 id="related-h" className="font-heading mb-8 text-2xl sm:text-3xl">You might also like</h2>
            <theme.ProductGrid products={related} currency={bundle.store.currency} Card={theme.ProductCard} />
          </Container>
        </section>
      ) : null}

      {bundle.settings.reviews?.enabled !== false ? <Container className="pb-14"><ProductReviews slug={product.slug} /></Container> : null}
    </>
  );
}
