import Link from "next/link";

import { CartLink } from "@/components/cart/CartLink";
import { AccountLink } from "@/components/store/AccountLink";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { StoreImage } from "@/components/ui/StoreImage";

import { minimal } from "../minimal";
import { LightFooter } from "../minimal/Footer";
import { SoftNewsletter } from "../minimal/Newsletter";
import { ArrowIcon, ProductBadges, SearchIcon, headingStyle } from "../shared/ui";
import type { BundleProps, CategorySectionProps, FeaturedProductsProps, ProductCardProps, ThemeDefinition } from "../types";

/** Fashion: centred wordmark, tall editorial hero, 3:4 cards that reveal a second photo on hover. */
function Header({ bundle }: BundleProps) {
  const { store, configuration } = bundle;

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-surface/95 backdrop-blur">
      <Container className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:py-5">
        <nav aria-label="Main" className="flex gap-6 overflow-x-auto text-[11px] font-medium uppercase tracking-[0.25em]">
          {configuration.navigation.map((item) => (
            <Link key={`${item.label}-${item.url}`} href={item.url} className="whitespace-nowrap opacity-70 transition-opacity hover:opacity-100">{item.label}</Link>
          ))}
        </nav>
        <Link href="/" className="font-heading order-first w-full text-center text-xl uppercase tracking-[0.3em] sm:order-none sm:w-auto sm:text-3xl sm:tracking-[0.35em]">{store.name}</Link>
        <div className="flex items-center justify-end gap-5">
          <Link href="/products" aria-label="Search products" className="hidden sm:block"><SearchIcon className="size-5" /></Link>
          <AccountLink className="!text-[11px] uppercase tracking-[0.2em]" />
          <CartLink className="!text-[11px] uppercase tracking-[0.2em]" />
        </div>
      </Container>
    </header>
  );
}

function Hero({ bundle }: BundleProps) {
  const { hero } = bundle.configuration;

  return (
    <section className="relative isolate flex min-h-[78vh] items-end overflow-hidden bg-primary text-primary-fg">
      {hero.image_url ? (
        <>
          <StoreImage src={hero.image_url} alt="" className="-z-10 object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,transparent_0%,transparent_58%,rgba(255,255,255,0.08)_58%,rgba(255,255,255,0.08)_100%)]" />
      )}
      <Container className="pb-16 pt-32 sm:pb-24">
        <p className="mb-5 text-[11px] uppercase tracking-[0.4em] opacity-80">{bundle.store.name}</p>
        <h1 className="font-heading max-w-4xl text-5xl uppercase leading-[1.05] sm:text-7xl lg:text-8xl" style={headingStyle}>{hero.title ?? bundle.store.name}</h1>
        {hero.subtitle ? <p className="mt-6 max-w-md text-xs uppercase leading-relaxed tracking-[0.25em] opacity-85">{hero.subtitle}</p> : null}
        {hero.cta_label && hero.cta_url ? (
          <div className="mt-10">
            <ButtonLink href={hero.cta_url} variant="secondary" className="!rounded-none !border-current !px-10 !py-3.5 !text-xs !uppercase !tracking-[0.3em] !text-current hover:!bg-white hover:!text-black">{hero.cta_label}</ButtonLink>
          </div>
        ) : null}
      </Container>
    </section>
  );
}

function ProductCard({ product, currency, priority }: ProductCardProps) {
  const [image, second] = product.images;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
        <StoreImage src={image?.url} alt={image?.alt ?? product.name} className={`object-cover transition-opacity duration-700 ${second ? "group-hover:opacity-0" : "transition-transform group-hover:scale-105"}`} priority={priority} />
        {second ? <StoreImage src={second.url} alt="" className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" /> : null}
        <ProductBadges product={product} className="left-0 top-0 !items-start p-3" />
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h3 className="min-w-0 flex-1 basis-28 text-xs font-medium uppercase leading-relaxed tracking-[0.2em]">{product.name}</h3>
        <Price amount={product.price} compareAt={product.compareAtPrice} currency={currency} className="!flex shrink-0 text-xs" />
      </div>
    </Link>
  );
}

function CategorySection({ categories, title = "Shop by category" }: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="py-20">
      <Container>
        <h2 className="font-heading mb-10 text-center text-xs uppercase tracking-[0.4em]" style={{ ...headingStyle, letterSpacing: "0.4em", fontWeight: 500 }}>{title}</h2>
        <ul className="border-t border-black/15">
          {categories.map((category, index) => (
            <li key={category.id} className="border-b border-black/15">
              <Link href={`/products?category=${category.slug}`} className="group flex items-baseline gap-6 py-6 transition-colors hover:bg-black/[0.03] sm:gap-10">
                <span className="w-8 text-xs tabular-nums opacity-40">{String(index + 1).padStart(2, "0")}</span>
                <span className="font-heading flex-1 text-3xl uppercase tracking-[0.12em] transition-all group-hover:translate-x-2 sm:text-5xl" style={{ fontWeight: 400 }}>{category.name}</span>
                {typeof category.productsCount === "number" ? <span className="hidden text-xs uppercase tracking-widest opacity-50 sm:block">{category.productsCount} items</span> : null}
                <ArrowIcon className="size-5 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function FeaturedProducts({ products, currency, title = "Featured products", Card }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-20">
      <Container>
        <div className="mb-12 flex items-end justify-between border-b border-black/15 pb-4">
          <h2 className="font-heading text-xs uppercase" style={{ ...headingStyle, letterSpacing: "0.4em", fontWeight: 500 }}>{title}</h2>
          <Link href="/products" className="text-[11px] uppercase tracking-[0.25em] underline underline-offset-8">View all</Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {products.map((product, index) => (
            <li key={product.id}><Card product={product} currency={currency} priority={index < 4} /></li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export const fashion: ThemeDefinition = {
  ...minimal,
  slug: "fashion",
  tokens: { radius: "0", headingTransform: "uppercase", headingTracking: "0.15em", headingWeight: "500", pill: "0", listLayout: "toolbar" },
  Header,
  Hero,
  ProductCard,
  CategorySection,
  FeaturedProducts,
  Newsletter: SoftNewsletter,
  Footer: LightFooter,
};
