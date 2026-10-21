import { getCategories, getProducts } from "@/lib/api/server";
import type { StoreBundle } from "@/lib/types";
import { getTheme } from "@/themes";

/**
 * Renders the merchant's configured homepage sections with the active theme's
 * components. Section order/enabled state/limits all come from the API config.
 */
export async function HomeSections({ host, bundle }: { host: string; bundle: StoreBundle }) {
  const theme = getTheme(bundle.theme?.slug);
  const sections = bundle.configuration.homepage.sections.filter((s) => s.enabled);
  const currency = bundle.store.currency;

  const needsProducts = sections.some((s) => s.type === "featured_products");
  const needsCategories = sections.some((s) => s.type === "categories");
  const limit = Math.min(Math.max(...sections.filter((s) => s.type === "featured_products").map((s) => s.config.limit ?? 8), 1), 24);

  const [products, categories] = await Promise.all([
    needsProducts ? getProducts(host, { per_page: limit }).then((p) => p.items) : Promise.resolve([]),
    needsCategories ? getCategories(host) : Promise.resolve([]),
  ]);

  return (
    <>
      {sections.map((section, index) => {
        const key = `${section.type}-${index}`;
        const title = section.config.title;

        switch (section.type) {
          case "hero":
            return <theme.Hero key={key} bundle={bundle} />;
          case "featured_products":
            return <theme.FeaturedProducts key={key} products={products.slice(0, section.config.limit ?? 8)} currency={currency} title={title} Card={theme.ProductCard} />;
          case "categories":
            return <theme.CategorySection key={key} categories={categories} title={title} />;
          case "testimonials":
            return <theme.Testimonials key={key} items={section.config.items ?? []} title={title} />;
          case "newsletter":
            return <theme.Newsletter key={key} title={title} />;
          default:
            return null; // unknown section types from newer API versions are skipped, never crash
        }
      })}
    </>
  );
}
