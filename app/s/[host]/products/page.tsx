import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageBanner } from "@/components/store/PageBanner";
import { ProductsSearchInput } from "@/components/store/ProductsSearchInput";
import { Pagination } from "@/components/store/Pagination";
import { getCategories, getProducts } from "@/lib/api/server";
import { parsePriceRange } from "@/lib/price-filter";
import { requireStore } from "@/lib/store-page";
import { getTheme } from "@/themes";

type Props = {
  params: Promise<{ host: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Boolean(first(sp.search) || first(sp.category) || first(sp.sort) || first(sp.min_price) || first(sp.max_price) || first(sp.page));

  return {
    title: "Products",
    alternates: { canonical: "/products" },
    // Filtered/sorted/paginated variants are not separate pages for search engines.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { host } = await params;
  const sp = await searchParams;
  const { bundle } = await requireStore(host);
  const theme = getTheme(bundle.theme?.slug);

  const category = first(sp.category);
  const search = first(sp.search)?.slice(0, 100);
  const sort = SORTS.some((s) => s.value === first(sp.sort)) ? first(sp.sort) : undefined;
  const minInput = first(sp.min_price)?.slice(0, 12);
  const maxInput = first(sp.max_price)?.slice(0, 12);
  const range = parsePriceRange(minInput, maxInput);
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);

  const [result, categories] = await Promise.all([
    getProducts(host, { category, search, sort, page, per_page: 12, min_price: range.min ?? undefined, max_price: range.max ?? undefined }).catch(() => null),
    getCategories(host),
  ]);

  const params2 = { category, search, sort, min_price: range.min !== null ? minInput : undefined, max_price: range.max !== null ? maxInput : undefined };
  const priceFiltered = range.min !== null || range.max !== null;
  const link = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params2, ...overrides })) if (v) q.set(k, v);
    const qs = q.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  const title = search ? `Results for “${search}”` : category ? (categories.find((c) => c.slug === category)?.name ?? "Products") : "All products";
  const activeCategory = categories.find((c) => c.slug === category);
  const chips = [
    ...(search ? [{ label: `“${search}”`, href: link({ search: undefined, page: undefined }) }] : []),
    ...(activeCategory ? [{ label: activeCategory.name, href: link({ category: undefined, page: undefined }) }] : []),
    ...(priceFiltered ? [{ label: `${params2.min_price ?? "0"} – ${params2.max_price ?? "any"} ${bundle.store.currency}`, href: link({ min_price: undefined, max_price: undefined, page: undefined }) }] : []),
  ];
  const searchKeep = { category, sort, min_price: params2.min_price, max_price: params2.max_price };
  const toolbar = theme.tokens.listLayout === "toolbar";
  const pill = (active: boolean) => `rounded-[var(--sf-pill,9999px)] border px-3.5 py-1.5 text-sm transition ${active ? "border-primary bg-primary text-primary-fg" : "border-black/15 hover:border-black/40"}`;
  const inputBase = "min-w-0 rounded-[var(--sf-radius)] border border-black/20 bg-white/70 px-3 py-2 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const input = `w-full ${inputBase}`;

  return (
    <>
      <PageBanner title={title} crumbs={[{ label: "Home", href: "/" }, { label: "Products", href: category || search ? "/products" : undefined }, ...(activeCategory ? [{ label: activeCategory.name }] : [])]}>
        {result ? `${result.total} product${result.total === 1 ? "" : "s"}` : null}
      </PageBanner>

      <Container className="py-10">
        <div className={toolbar ? "space-y-8" : "grid gap-8 lg:grid-cols-[16rem_1fr]"}>
          {toolbar ? (
            <div aria-label="Filters" role="region" className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <form action="/products" role="search" className="min-w-0 flex-1 basis-64">
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  {sort ? <input type="hidden" name="sort" value={sort} /> : null}
                  {priceFiltered ? <><input type="hidden" name="min_price" value={params2.min_price ?? ""} /><input type="hidden" name="max_price" value={params2.max_price ?? ""} /></> : null}
                  <label htmlFor="q" className="sr-only">Search</label>
                  <ProductsSearchInput initial={search ?? ""} keep={searchKeep} placeholder="Search products" className={`sf-input ${input}`} />
                </form>
                <form action="/products" aria-labelledby="price-h" className="flex flex-wrap items-center gap-2">
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  {search ? <input type="hidden" name="search" value={search} /> : null}
                  {sort ? <input type="hidden" name="sort" value={sort} /> : null}
                  <span id="price-h" className="text-sm font-medium opacity-60">Price ({bundle.store.currency})</span>
                  <label htmlFor="min-price" className="sr-only">Minimum price</label>
                  <input id="min-price" name="min_price" inputMode="decimal" placeholder="Min" defaultValue={params2.min_price} className={`sf-input w-24 ${inputBase}`} />
                  <span aria-hidden="true">–</span>
                  <label htmlFor="max-price" className="sr-only">Maximum price</label>
                  <input id="max-price" name="max_price" inputMode="decimal" placeholder="Max" defaultValue={params2.max_price} className={`sf-input w-24 ${inputBase}`} />
                  <button type="submit" className="rounded-[var(--sf-pill,9999px)] bg-primary px-5 py-2 text-sm font-semibold text-primary-fg transition hover:opacity-90">Apply</button>
                  {priceFiltered ? <Link href={link({ min_price: undefined, max_price: undefined, page: undefined })} className="text-sm underline underline-offset-4">Clear</Link> : null}
                </form>
              </div>
              <ul className="flex flex-wrap gap-2" aria-label="Categories">
                <li><Link href={link({ category: undefined, page: undefined })} aria-current={!category ? "true" : undefined} className={pill(!category)}>All</Link></li>
                {categories.map((c) => <li key={c.id}><Link href={link({ category: c.slug, page: undefined })} aria-current={category === c.slug ? "true" : undefined} className={pill(category === c.slug)}>{c.name}{typeof c.productsCount === "number" ? <span className="ml-1.5 opacity-60">{c.productsCount}</span> : null}</Link></li>)}
              </ul>
            </div>
          ) : (
          <aside aria-label="Filters">
            <details className="sf-panel group rounded-[var(--sf-radius)] bg-surface shadow-sm ring-1 ring-black/10 lg:!block" open>
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold lg:hidden">Filters<span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></summary>
              <div className="space-y-7 px-5 pb-5 pt-1 text-sm lg:p-6">
                <form action="/products" role="search">
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  {sort ? <input type="hidden" name="sort" value={sort} /> : null}
                  {priceFiltered ? <><input type="hidden" name="min_price" value={params2.min_price ?? ""} /><input type="hidden" name="max_price" value={params2.max_price ?? ""} /></> : null}
                  <label htmlFor="q" className="mb-2 block font-semibold">Search</label>
                  <ProductsSearchInput initial={search ?? ""} keep={searchKeep} placeholder="What are you looking for?" className={`sf-input ${input}`} />
                </form>

                <div>
                  <p className="mb-3 font-semibold">Categories</p>
                  <ul className="space-y-1">
                    <li><Link href={link({ category: undefined, page: undefined })} aria-current={!category ? "true" : undefined} className={`block rounded-md px-3 py-1.5 ${!category ? "bg-primary/10 font-semibold" : "opacity-80 hover:bg-black/5"}`}>All</Link></li>
                    {categories.map((c) => (
                      <li key={c.id}>
                        <Link href={link({ category: c.slug, page: undefined })} aria-current={category === c.slug ? "true" : undefined} className={`flex items-center justify-between rounded-md px-3 py-1.5 ${category === c.slug ? "bg-primary/10 font-semibold" : "opacity-80 hover:bg-black/5"}`}>
                          <span>{c.name}</span>
                          {typeof c.productsCount === "number" ? <span className="text-xs opacity-50">{c.productsCount}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <form action="/products" aria-labelledby="price-h">
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  {search ? <input type="hidden" name="search" value={search} /> : null}
                  {sort ? <input type="hidden" name="sort" value={sort} /> : null}
                  <p id="price-h" className="mb-3 font-semibold">Price ({bundle.store.currency})</p>
                  <div className="flex items-center gap-2">
                    <label htmlFor="min-price" className="sr-only">Minimum price</label>
                    <input id="min-price" name="min_price" inputMode="decimal" placeholder="Min" defaultValue={params2.min_price} className={`sf-input ${input}`} />
                    <span aria-hidden="true">–</span>
                    <label htmlFor="max-price" className="sr-only">Maximum price</label>
                    <input id="max-price" name="max_price" inputMode="decimal" placeholder="Max" defaultValue={params2.max_price} className={`sf-input ${input}`} />
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <button type="submit" className="rounded-[var(--sf-pill,9999px)] bg-primary px-5 py-2 font-semibold text-primary-fg transition hover:opacity-90">Apply</button>
                    {priceFiltered ? <Link href={link({ min_price: undefined, max_price: undefined, page: undefined })} className="underline underline-offset-4">Clear</Link> : null}
                  </div>
                </form>
              </div>
            </details>
          </aside>
          )}

          <section aria-live="polite">
            <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort by">
                <span className="mr-1 text-sm font-medium opacity-60">Sort</span>
                {SORTS.map((s) => <Link key={s.value} href={link({ sort: s.value, page: undefined })} aria-current={(sort ?? "newest") === s.value ? "true" : undefined} className={pill((sort ?? "newest") === s.value)}>{s.label}</Link>)}
              </div>
            </div>
            {chips.length > 0 ? (
              <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
                <span className="opacity-60">Filtered by</span>
                {chips.map((chip) => <Link key={chip.label} href={chip.href} aria-label={`Remove filter ${chip.label}`} className="inline-flex items-center gap-1.5 rounded-[var(--sf-pill,9999px)] bg-primary/10 px-3 py-1 font-medium hover:bg-primary/20">{chip.label}<span aria-hidden="true">×</span></Link>)}
              </div>
            ) : null}

            {result === null ? (
              <p>We couldn&apos;t load products right now. Please try again.</p>
            ) : result.items.length === 0 ? (
              <div className="rounded-[var(--sf-radius)] border border-dashed border-black/20 px-6 py-16 text-center">
                <p className="font-heading text-xl">No products found</p>
                <p className="mt-2 text-sm opacity-70">Try a different search or clear your filters.</p>
                <Link href="/products" className="mt-5 inline-block rounded-[var(--sf-pill,9999px)] bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg">View all products</Link>
              </div>
            ) : (
              <>
                <theme.ProductGrid products={result.items} currency={bundle.store.currency} Card={theme.ProductCard} />
                <Pagination basePath="/products" params={params2} currentPage={result.currentPage} lastPage={result.lastPage} />
              </>
            )}
          </section>
        </div>
      </Container>
    </>
  );
}
