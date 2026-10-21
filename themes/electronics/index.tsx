import Link from "next/link";

import { CartLink } from "@/components/cart/CartLink";
import { AccountLink } from "@/components/store/AccountLink";
import { Stars } from "@/components/store/Stars";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { StoreImage } from "@/components/ui/StoreImage";

import { minimal } from "../minimal";
import { ArrowIcon, HeaderSearch, ProductBadges, SectionHeader, headingStyle } from "../shared/ui";
import type { BundleProps, CategorySectionProps, ProductCardProps, ThemeDefinition } from "../types";

/** Electronics: a dark two-row header with a wide search, a tech-grid hero, boxed spec-sheet cards. */
function Header({ bundle }: BundleProps) {
  const { store, configuration } = bundle;

  return (
    <header className="sticky top-0 z-30 shadow-sm">
      <div className="bg-primary text-primary-fg">
        <Container className="flex items-center gap-4 py-3 sm:gap-8">
          <Link href="/" className="font-heading text-xl font-extrabold tracking-tight">{store.name}</Link>
          <HeaderSearch tone="dark" className="hidden max-w-xl flex-1 md:block" />
          <div className="ml-auto flex items-center gap-5"><AccountLink /><CartLink /></div>
        </Container>
      </div>
      <nav aria-label="Main" className="border-b border-black/10 bg-surface">
        <Container className="flex gap-7 overflow-x-auto py-2.5 text-sm font-medium">
          {configuration.navigation.map((item) => (
            <Link key={`${item.label}-${item.url}`} href={item.url} className="whitespace-nowrap border-b-2 border-transparent py-0.5 opacity-80 transition hover:border-accent hover:opacity-100">{item.label}</Link>
          ))}
        </Container>
      </nav>
    </header>
  );
}

function Hero({ bundle }: BundleProps) {
  const { hero } = bundle.configuration;

  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-fg">
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div aria-hidden="true" className="absolute -right-24 top-0 -z-10 size-[32rem] rounded-full bg-accent/30 blur-3xl" />
      <Container className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-4 inline-block border-l-4 border-accent pl-3 text-xs font-semibold uppercase tracking-[0.25em] opacity-90">{bundle.store.name}</p>
          <h1 className="font-heading text-5xl leading-[1.05] sm:text-6xl" style={headingStyle}>{hero.title ?? bundle.store.name}</h1>
          {hero.subtitle ? <p className="mt-5 max-w-lg text-lg opacity-85">{hero.subtitle}</p> : null}
          <div className="mt-9 flex flex-wrap gap-3">
            {hero.cta_label && hero.cta_url ? <ButtonLink href={hero.cta_url} className="!bg-accent !px-8 !py-3 !text-accent-fg">{hero.cta_label}</ButtonLink> : null}
            <ButtonLink href="/products" variant="secondary" className="!border-white/40 !px-8 !py-3 !text-current hover:!bg-white/10">View catalogue</ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/3] w-full max-w-lg">
          <div aria-hidden="true" className="absolute inset-0 border border-white/20" style={{ transform: "translate(14px, 14px)" }} />
          <div className="relative size-full overflow-hidden border border-white/20 bg-white/5">
            <StoreImage src={hero.image_url} alt="" className="object-cover" sizes="(min-width: 768px) 32rem, 90vw" priority />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ProductCard({ product, currency, priority }: ProductCardProps) {
  const image = product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group flex h-full flex-col border border-black/15 bg-white p-3 text-black transition-all duration-200 hover:border-primary hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
        <StoreImage src={image?.url} alt={image?.alt ?? product.name} className="object-contain p-2 transition-transform duration-300 group-hover:scale-105" priority={priority} />
        <ProductBadges product={product} />
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
      {(product.ratingCount ?? 0) > 0 ? <Stars average={product.ratingAverage ?? 0} count={product.ratingCount} size="size-3.5" className="!flex mt-1" /> : null}
      {product.shortDescription ? <p className="mt-1 line-clamp-2 text-xs text-black/60">{product.shortDescription}</p> : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 border-t border-black/10 pt-3">
        <Price amount={product.price} compareAt={product.compareAtPrice} currency={currency} className="text-base" />
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${product.inStock ? "text-green-700" : "text-red-700"}`}>
          <span aria-hidden="true" className={`size-1.5 rounded-full ${product.inStock ? "bg-green-600" : "bg-red-600"}`} />
          {product.inStock ? "In stock" : "Out of stock"}
        </span>
      </div>
    </Link>
  );
}

function CategorySection({ categories, title = "Shop by category" }: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="bg-black/[0.03] py-14">
      <Container>
        <SectionHeader title={title} href="/products" linkLabel="All products" />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/products?category=${category.slug}`} className="group flex h-full items-center justify-between gap-3 border border-black/10 border-t-4 border-t-accent bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <span>
                  <span className="block font-semibold">{category.name}</span>
                  {typeof category.productsCount === "number" ? <span className="text-xs opacity-60">{category.productsCount} products</span> : null}
                </span>
                <ArrowIcon className="size-5 shrink-0 opacity-40 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export const electronics: ThemeDefinition = {
  ...minimal,
  slug: "electronics",
  tokens: { radius: "0.125rem", headingTransform: "none", headingTracking: "-0.02em", headingWeight: "800", pill: "0.125rem", listLayout: "sidebar" },
  Header,
  Hero,
  ProductCard,
  CategorySection,
};
