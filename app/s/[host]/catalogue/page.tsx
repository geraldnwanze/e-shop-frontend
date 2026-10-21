import type { Metadata } from "next";
import Link from "next/link";

import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { StoreImage } from "@/components/ui/StoreImage";
import { getProducts } from "@/lib/api/server";
import { groupByCategory } from "@/lib/catalogue";
import { requireStore } from "@/lib/store-page";
import type { Product } from "@/lib/types";
import { productMessage, whatsappLink } from "@/lib/whatsapp";

type Props = { params: Promise<{ host: string }> };

const PAGE_SIZE = 48;
const MAX_PAGES = 4;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host } = await params;
  const { bundle } = await requireStore(host);
  const name = bundle.store.name;
  const description = `Browse everything ${name} sells and order in a few taps.`;

  return {
    title: "Catalogue",
    description,
    alternates: { canonical: "/catalogue" },
    openGraph: { title: `${name} catalogue`, description, type: "website" },
  };
}

async function loadAll(host: string): Promise<Product[] | null> {
  try {
    const all: Product[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await getProducts(host, { page, per_page: PAGE_SIZE });
      all.push(...result.items);
      if (page >= result.lastPage) break;
    }

    return all;
  } catch {
    return null;
  }
}

export default async function CataloguePage({ params }: Props) {
  const { host } = await params;
  const { bundle, origin } = await requireStore(host);
  const products = await loadAll(host);
  const currency = bundle.store.currency;
  const whatsapp = bundle.settings.whatsapp;
  const sections = products ? groupByCategory(products) : [];

  return (
    <Container className="py-10">
      <header className="mb-8">
        <h1 className="font-heading text-3xl">{bundle.store.name} catalogue</h1>
        <p className="mt-2 opacity-70">{products ? `${products.length} product${products.length === 1 ? "" : "s"}` : ""}</p>
        {sections.length > 1 ? (
          <nav aria-label="Categories" className="mt-4 flex flex-wrap gap-2 text-sm">
            {sections.map((s) => (
              <a key={s.slug ?? "other"} href={`#${s.slug ?? "other"}`} className="rounded-full border border-black/15 px-3 py-1 hover:bg-black/5">{s.name}</a>
            ))}
          </nav>
        ) : null}
      </header>

      {products === null ? (
        <p>We couldn&apos;t load the catalogue right now. Please try again.</p>
      ) : products.length === 0 ? (
        <p className="opacity-70">Nothing here yet. Please check back soon.</p>
      ) : (
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.slug ?? "other"} id={section.slug ?? "other"} aria-labelledby={`h-${section.slug ?? "other"}`} className="scroll-mt-24">
              <h2 id={`h-${section.slug ?? "other"}`} className="mb-4 border-b border-black/10 pb-2 font-heading text-xl">{section.name}</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {section.products.map((product) => {
                  const image = product.images[0];
                  const href = whatsapp
                    ? whatsappLink(whatsapp, productMessage(whatsapp, { name: product.name, quantity: 1, unitPrice: product.price, currency, url: `${origin}/products/${product.slug}` }))
                    : null;

                  return (
                    <li key={product.id} className="flex gap-4 rounded-[var(--sf-radius)] border border-black/10 p-3">
                      <Link href={`/products/${product.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-black/5">
                        <StoreImage src={image?.url} alt={image?.alt ?? product.name} sizes="96px" className="object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link href={`/products/${product.slug}`} className="font-medium hover:underline">{product.name}</Link>
                        {product.shortDescription ? <p className="mt-0.5 line-clamp-2 text-sm opacity-70">{product.shortDescription}</p> : null}
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                          <Price amount={product.price} compareAt={product.compareAtPrice} currency={currency} className="text-sm" />
                          {!product.inStock ? (
                            <span className="text-xs font-medium opacity-60">Sold out</span>
                          ) : product.variants.length > 0 || !href ? (
                            <ButtonLink href={`/products/${product.slug}`} variant="secondary" className="px-3 py-1.5">{product.variants.length > 0 ? "Choose option" : "View"}</ButtonLink>
                          ) : (
                            <WhatsAppButton href={href} className="px-3 py-1.5" />
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
