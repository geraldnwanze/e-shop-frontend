import type { ComponentType } from "react";

import type { Category, HomepageSection, Product, StoreBundle } from "@/lib/types";

export interface BundleProps {
  bundle: StoreBundle;
}

export interface ProductCardProps {
  product: Product;
  currency: string;
  priority?: boolean;
}

export interface ProductGridProps {
  products: Product[];
  currency: string;
  /** The active theme's card; injected by the section renderer so grids and cards always match. */
  Card: ComponentType<ProductCardProps>;
}

export interface CategorySectionProps {
  categories: Category[];
  title?: string;
}

export interface FeaturedProductsProps {
  products: Product[];
  currency: string;
  title?: string;
  Card: ComponentType<ProductCardProps>;
}

export interface TestimonialsProps {
  items: NonNullable<HomepageSection["config"]["items"]>;
  title?: string;
}

export interface NewsletterProps {
  title?: string;
}

/** Visual tokens a theme contributes as CSS variables (see StoreShell). */
export interface ThemeTokens {
  radius: string;
  headingTransform: "none" | "uppercase";
  headingTracking: string;
  headingWeight: string;
  /** Corner radius of pills (sort chips, option buttons, pagination): "9999px" for round, "0" for square. */
  pill: string;
  /** Product list filters: a left sidebar, or a toolbar above the grid. */
  listLayout: "sidebar" | "toolbar";
}

/**
 * The contract every storefront theme implements. The storefront engine only
 * ever talks to this interface; adding a theme = adding a folder + one registry line.
 */
export interface ThemeDefinition {
  slug: string;
  tokens: ThemeTokens;
  Header: ComponentType<BundleProps>;
  Hero: ComponentType<BundleProps>;
  ProductGrid: ComponentType<ProductGridProps>;
  ProductCard: ComponentType<ProductCardProps>;
  CategorySection: ComponentType<CategorySectionProps>;
  FeaturedProducts: ComponentType<FeaturedProductsProps>;
  Testimonials: ComponentType<TestimonialsProps>;
  Newsletter: ComponentType<NewsletterProps>;
  Footer: ComponentType<BundleProps>;
}
