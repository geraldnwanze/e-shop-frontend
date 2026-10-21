import Link from "next/link";

import { CartLink } from "@/components/cart/CartLink";
import { AccountLink } from "@/components/store/AccountLink";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { StoreImage } from "@/components/ui/StoreImage";

import { minimal } from "../minimal";
import { ProductBadges, headingStyle } from "../shared/ui";
import type { BundleProps, CategorySectionProps, FeaturedProductsProps, ProductCardProps, ProductGridProps, ThemeDefinition } from "../types";

/** Restaurant: a centred header, an overlay hero, and a menu with dotted leaders between name and price. */
const Ornament = () => (
  <div aria-hidden="true" className="flex items-center justify-center gap-3 text-accent brightness-90">
    <span className="h-px w-12 bg-current opacity-50" />
    <span className="text-sm">❖</span>
    <span className="h-px w-12 bg-current opacity-50" />
  </div>
);

function Header({ bundle }: BundleProps) {
  const { store, configuration } = bundle;

  return (
    <header className="border-b border-black/10 bg-surface">
      <Container className="flex flex-col items-center gap-3 py-5">
        <Link href="/" className="font-heading text-3xl" style={headingStyle}>{store.name}</Link>
        <div className="flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
          <nav aria-label="Main" className="flex gap-7">
            {configuration.navigation.map((item) => (
              <Link key={`${item.label}-${item.url}`} href={item.url} className="whitespace-nowrap uppercase tracking-[0.18em] opacity-70 transition-opacity hover:opacity-100">{item.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-5"><AccountLink /><CartLink /></div>
        </div>
      </Container>
    </header>
  );
}

function Hero({ bundle }: BundleProps) {
  const { hero } = bundle.configuration;

  return (
    <section className="relative isolate bg-primary text-primary-fg">
      {hero.image_url ? (
        <>
          <StoreImage src={hero.image_url} alt="" className="-z-10 object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 -z-10 bg-black/55" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.14),transparent_60%)]" />
      )}
      <Container className="flex flex-col items-center py-24 text-center sm:py-32">
        <Ornament />
        <h1 className="font-heading mt-6 max-w-3xl text-5xl leading-tight sm:text-7xl" style={headingStyle}>{hero.title ?? bundle.store.name}</h1>
        {hero.subtitle ? <p className="mt-5 max-w-xl text-lg italic opacity-90">{hero.subtitle}</p> : null}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {hero.cta_label && hero.cta_url ? <ButtonLink href={hero.cta_url} className="!bg-accent !px-9 !py-3 !uppercase !tracking-[0.18em] !text-accent-fg">{hero.cta_label}</ButtonLink> : null}
        </div>
      </Container>
    </section>
  );
}

function ProductCard({ product, currency, priority }: ProductCardProps) {
  const image = product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group flex items-center gap-4 py-5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-black/5 sm:size-24">
        <StoreImage src={image?.url} alt={image?.alt ?? product.name} className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="96px" priority={priority} />
        <ProductBadges product={product} className="left-1 top-1 scale-90" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="font-heading text-xl group-hover:underline group-hover:underline-offset-4" style={headingStyle}>{product.name}</h3>
          <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-3px] border-b-2 border-dotted border-black/30" />
          <Price amount={product.price} compareAt={product.compareAtPrice} currency={currency} className="shrink-0 text-lg" />
        </div>
        {product.shortDescription ? <p className="mt-1 line-clamp-2 text-sm italic opacity-65">{product.shortDescription}</p> : null}
      </div>
    </Link>
  );
}

function ProductGrid({ products, currency, Card }: ProductGridProps) {
  return (
    <ul className="grid gap-x-16 divide-y divide-black/10 md:grid-cols-2 md:divide-y-0 [&>li]:border-b [&>li]:border-black/10">
      {products.map((product, index) => (
        <li key={product.id}>
          <Card product={product} currency={currency} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

function FeaturedProducts({ products, currency, title = "Featured products", Card }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-20">
      <Container>
        <div className="mb-12 text-center">
          <Ornament />
          <h2 className="font-heading mt-4 text-4xl" style={headingStyle}>{title}</h2>
        </div>
        <ProductGrid products={products} currency={currency} Card={Card} />
        <div className="mt-12 text-center">
          <ButtonLink href="/products" variant="secondary" className="!px-9 !uppercase !tracking-[0.18em]">Full menu</ButtonLink>
        </div>
      </Container>
    </section>
  );
}

function CategorySection({ categories, title = "Shop by category" }: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="bg-accent/10 py-14">
      <Container className="text-center">
        <h2 className="font-heading mb-8 text-3xl" style={headingStyle}>{title}</h2>
        <ul className="flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/products?category=${category.slug}`} className="inline-block rounded-full border border-foreground/30 bg-surface px-7 py-2.5 text-sm uppercase tracking-[0.16em] transition-colors hover:border-foreground hover:bg-foreground hover:text-surface">{category.name}</Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export const restaurant: ThemeDefinition = {
  ...minimal,
  slug: "restaurant",
  tokens: { radius: "0.25rem", headingTransform: "none", headingTracking: "0", headingWeight: "600", pill: "0.25rem", listLayout: "toolbar" },
  Header,
  Hero,
  ProductCard,
  ProductGrid,
  FeaturedProducts,
  CategorySection,
};
