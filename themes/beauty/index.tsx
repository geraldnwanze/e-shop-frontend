import Link from "next/link";

import { CartLink } from "@/components/cart/CartLink";
import { AccountLink } from "@/components/store/AccountLink";
import { Stars } from "@/components/store/Stars";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Price } from "@/components/ui/Price";
import { StoreImage } from "@/components/ui/StoreImage";

import { minimal } from "../minimal";
import { LightFooter } from "../minimal/Footer";
import { SoftNewsletter } from "../minimal/Newsletter";
import { HeaderSearch, HeroBackdrop, ProductBadges, headingStyle } from "../shared/ui";
import type { BundleProps, CategorySectionProps, ProductCardProps, ThemeDefinition } from "../types";

/** Beauty: a floating pill header, centred soft hero, rounded pastel cards. */
function Header({ bundle }: BundleProps) {
  const { store, configuration } = bundle;

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
      <Container className="!max-w-6xl rounded-[2rem] bg-surface/90 py-2.5 md:rounded-full pl-6 pr-4 shadow-lg shadow-black/5 ring-1 ring-black/5 backdrop-blur-xl sm:!px-7">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-heading text-xl tracking-wide">{store.name}</Link>
          <nav aria-label="Main" className="hidden flex-1 gap-6 text-sm md:flex">
            {configuration.navigation.map((item) => (
              <Link key={`${item.label}-${item.url}`} href={item.url} className="whitespace-nowrap opacity-70 transition-opacity hover:opacity-100">{item.label}</Link>
            ))}
          </nav>
          <HeaderSearch className="ml-auto hidden w-48 lg:block" />
          <div className="ml-auto flex items-center gap-4 lg:ml-0"><AccountLink /><CartLink /></div>
        </div>
        <nav aria-label="Main" className="-mx-2 mt-2 flex gap-5 overflow-x-auto border-t border-black/5 px-2 pt-2 text-sm md:hidden">
          {configuration.navigation.map((item) => (
            <Link key={`m-${item.label}-${item.url}`} href={item.url} className="whitespace-nowrap opacity-70">{item.label}</Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}

function Hero({ bundle }: BundleProps) {
  const { hero } = bundle.configuration;

  return (
    <section className="relative isolate -mt-16 overflow-hidden bg-primary/[0.06] pt-16">
      <HeroBackdrop tone="soft" />
      <Container className="grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
        <div className="text-center md:text-left">
          <p className="text-sm tracking-[0.3em] text-accent brightness-90">✦ {bundle.store.name.toUpperCase()} ✦</p>
          <h1 className="font-heading mt-5 text-5xl leading-[1.1] sm:text-6xl" style={headingStyle}>{hero.title ?? bundle.store.name}</h1>
          {hero.subtitle ? <p className="mt-5 text-lg opacity-75">{hero.subtitle}</p> : null}
          <div className="mt-9 flex flex-wrap justify-center gap-3 md:justify-start">
            {hero.cta_label && hero.cta_url ? <ButtonLink href={hero.cta_url} className="!rounded-full !px-8 !py-3 shadow-lg shadow-primary/25">{hero.cta_label}</ButtonLink> : null}
            <ButtonLink href="/products" variant="secondary" className="!rounded-full !px-8 !py-3">Browse all</ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm">
          <div aria-hidden="true" className="absolute -inset-3 rounded-t-full rounded-b-[2rem] bg-accent/25 blur-xl" />
          <div className="relative size-full overflow-hidden rounded-t-full rounded-b-[2rem] bg-white/50 ring-1 ring-black/5">
            <StoreImage src={hero.image_url} alt="" className="object-cover" sizes="(min-width: 768px) 24rem, 80vw" priority />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ProductCard({ product, currency, priority }: ProductCardProps) {
  const image = product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group block text-center">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-primary/[0.06] ring-1 ring-black/5 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/15">
        <StoreImage src={image?.url} alt={image?.alt ?? product.name} className="object-cover transition-transform duration-700 group-hover:scale-105" priority={priority} />
        <ProductBadges product={product} className="left-4 top-4" />
      </div>
      <h3 className="font-heading mt-5 text-lg">{product.name}</h3>
      {(product.ratingCount ?? 0) > 0 ? <Stars average={product.ratingAverage ?? 0} count={product.ratingCount} size="size-3.5" className="!flex mt-1 justify-center" /> : null}
      <Price amount={product.price} compareAt={product.compareAtPrice} currency={currency} className="!flex mt-1 justify-center text-sm" />
    </Link>
  );
}

function CategorySection({ categories, title = "Shop by category" }: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="py-16">
      <Container>
        <div className="mb-10 text-center">
          <p className="text-sm tracking-[0.3em] text-accent brightness-90">✦ BROWSE ✦</p>
          <h2 className="font-heading mt-3 text-3xl sm:text-4xl" style={headingStyle}>{title}</h2>
        </div>
        <ul className="flex flex-wrap justify-center gap-x-10 gap-y-8">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/products?category=${category.slug}`} className="group flex w-28 flex-col items-center gap-3 text-center sm:w-32">
                <span className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-accent/30 to-primary/10 ring-1 ring-black/5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg sm:size-28">
                  <span aria-hidden="true" className="font-heading text-4xl text-primary/50">{category.name.charAt(0).toUpperCase()}</span>
                </span>
                <span className="text-sm font-medium">{category.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export const beauty: ThemeDefinition = {
  ...minimal,
  slug: "beauty",
  tokens: { radius: "1.25rem", headingTransform: "none", headingTracking: "0", headingWeight: "500", pill: "9999px", listLayout: "toolbar" },
  Header,
  Hero,
  ProductCard,
  CategorySection,
  Newsletter: SoftNewsletter,
  Footer: LightFooter,
};
