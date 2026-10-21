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

/** Modern: heavy type, a gradient hero with a tilted photo, bordered cards with an offset shadow. */
function Header({ bundle }: BundleProps) {
  const { store, configuration } = bundle;

  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground bg-surface">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <Link href="/" className="font-heading text-2xl font-extrabold tracking-tight">{store.name}<span className="text-accent">.</span></Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-2 overflow-x-auto text-sm font-semibold sm:order-none sm:w-auto sm:flex-1">
          {configuration.navigation.map((item) => (
            <Link key={`${item.label}-${item.url}`} href={item.url} className="whitespace-nowrap rounded-full px-4 py-1.5 transition-colors hover:bg-foreground hover:text-surface">{item.label}</Link>
          ))}
        </nav>
        <HeaderSearch className="hidden w-48 md:block" />
        <div className="ml-auto flex items-center gap-5 sm:ml-0"><AccountLink /><CartLink /></div>
      </Container>
    </header>
  );
}

function Hero({ bundle }: BundleProps) {
  const { hero } = bundle.configuration;

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-primary via-primary to-accent/70 text-primary-fg">
      <div aria-hidden="true" className="absolute -left-20 top-1/2 -z-10 size-96 -translate-y-1/2 rounded-full bg-accent/30 blur-3xl" />
      <Container className="grid items-center gap-12 py-20 md:grid-cols-[1.15fr_1fr] md:py-28">
        <div>
          <h1 className="font-heading text-6xl leading-[0.95] sm:text-7xl lg:text-8xl" style={headingStyle}>{hero.title ?? bundle.store.name}</h1>
          {hero.subtitle ? <p className="mt-7 max-w-lg text-xl opacity-90">{hero.subtitle}</p> : null}
          <div className="mt-10 flex flex-wrap gap-3">
            {hero.cta_label && hero.cta_url ? <ButtonLink href={hero.cta_url} className="!rounded-full !bg-accent !px-8 !py-3.5 !text-base !text-accent-fg shadow-[4px_4px_0_0_rgba(0,0,0,0.35)]">{hero.cta_label}</ButtonLink> : null}
            <ButtonLink href="/products" variant="secondary" className="!rounded-full !border-2 !border-current !px-8 !py-3.5 !text-base !text-current hover:!bg-white/10">Browse all</ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 rounded-[2rem] bg-accent" />
          <div className="relative aspect-[4/5] -rotate-2 overflow-hidden rounded-[2rem] border-4 border-white bg-white/10 shadow-2xl">
            <StoreImage src={hero.image_url} alt="" className="object-cover" sizes="(min-width: 768px) 28rem, 90vw" priority />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ProductCard({ product, currency, priority }: ProductCardProps) {
  const image = product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group block overflow-hidden rounded-2xl border-2 border-foreground bg-surface transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--sf-text)]">
      <div className="relative aspect-square border-b-2 border-foreground bg-black/5">
        <StoreImage src={image?.url} alt={image?.alt ?? product.name} className="object-cover" priority={priority} />
        <ProductBadges product={product} />
      </div>
      <div className="p-4">
        <h3 className="font-heading text-lg font-bold leading-tight">{product.name}</h3>
        {(product.ratingCount ?? 0) > 0 ? <Stars average={product.ratingAverage ?? 0} count={product.ratingCount} size="size-3.5" className="!flex mt-1" /> : null}
        <Price amount={product.price} compareAt={product.compareAtPrice} currency={currency} className="!flex mt-2 text-base" />
      </div>
    </Link>
  );
}

function CategorySection({ categories, title = "Shop by category" }: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="py-16">
      <Container>
        <SectionHeader title={title} href="/products" linkLabel="Everything" />
        <ul className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/products?category=${category.slug}`} className="group inline-flex items-center gap-3 rounded-full border-2 border-foreground px-6 py-3 text-lg font-bold transition-colors hover:bg-foreground hover:text-surface">
                {category.name}
                {typeof category.productsCount === "number" ? <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-fg">{category.productsCount}</span> : null}
                <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export const modern: ThemeDefinition = {
  ...minimal,
  slug: "modern",
  tokens: { radius: "1rem", headingTransform: "none", headingTracking: "-0.04em", headingWeight: "800", pill: "9999px", listLayout: "sidebar" },
  Header,
  Hero,
  ProductCard,
  CategorySection,
};
